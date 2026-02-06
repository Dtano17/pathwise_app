import Foundation
import Capacitor
import Speech
import AVFoundation

@objc(NativeSpeech)
public class SpeechPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeSpeech"
    public let jsName = "NativeSpeech"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startListening", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopListening", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSupportedLanguages", returnType: CAPPluginReturnPromise)
    ]

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine: AVAudioEngine?
    private var isListening = false
    private var activeCall: CAPPluginCall?

    public override func load() {
        super.load()
        print("[SpeechPlugin] Plugin loaded")
        audioEngine = AVAudioEngine()
    }

    // MARK: - Check Availability

    @objc func isAvailable(_ call: CAPPluginCall) {
        let locale = Locale(identifier: "en-US")
        let recognizer = SFSpeechRecognizer(locale: locale)
        let available = recognizer?.isAvailable ?? false

        var result: [String: Any] = [
            "available": available,
            "platform": "ios"
        ]

        if !available {
            result["reason"] = "Speech recognition not available on this device"
        }

        print("[SpeechPlugin] Speech recognition available: \(available)")
        call.resolve(result)
    }

    // MARK: - Check Permission

    @objc func checkPermission(_ call: CAPPluginCall) {
        let speechStatus = SFSpeechRecognizer.authorizationStatus()
        let granted = speechStatus == .authorized

        call.resolve([
            "granted": granted,
            "platform": "ios",
            "status": speechAuthStatusToString(speechStatus)
        ])
    }

    // MARK: - Request Permission

    @objc func requestPermission(_ call: CAPPluginCall) {
        // Need to request both speech recognition and microphone permissions
        SFSpeechRecognizer.requestAuthorization { speechStatus in
            if speechStatus == .authorized {
                // Also request microphone permission
                AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
                    let granted = speechStatus == .authorized && micGranted

                    call.resolve([
                        "granted": granted,
                        "platform": "ios",
                        "speechStatus": self.speechAuthStatusToString(speechStatus),
                        "microphoneGranted": micGranted
                    ])
                }
            } else {
                call.resolve([
                    "granted": false,
                    "platform": "ios",
                    "speechStatus": self.speechAuthStatusToString(speechStatus)
                ])
            }
        }
    }

    // MARK: - Start Listening

    @objc func startListening(_ call: CAPPluginCall) {
        // Check speech recognition permission
        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            call.reject("Speech recognition permission not granted")
            return
        }

        // Check if already listening
        guard !isListening else {
            call.reject("Already listening")
            return
        }

        let language = call.getString("language") ?? "en-US"
        let partialResults = call.getBool("partialResults") ?? true

        activeCall = call

        DispatchQueue.main.async {
            do {
                try self.startRecognition(language: language, partialResults: partialResults)
            } catch {
                print("[SpeechPlugin] Failed to start speech recognition: \(error.localizedDescription)")
                call.reject("Failed to start speech recognition: \(error.localizedDescription)")
                self.activeCall = nil
            }
        }
    }

    private func startRecognition(language: String, partialResults: Bool) throws {
        // Cancel any existing task
        recognitionTask?.cancel()
        recognitionTask = nil

        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        guard let audioEngine = audioEngine else {
            throw NSError(domain: "SpeechPlugin", code: -1, userInfo: [NSLocalizedDescriptionKey: "Audio engine not initialized"])
        }

        // Create speech recognizer for specified language
        let locale = Locale(identifier: language)
        speechRecognizer = SFSpeechRecognizer(locale: locale)

        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            throw NSError(domain: "SpeechPlugin", code: -2, userInfo: [NSLocalizedDescriptionKey: "Speech recognizer not available for language: \(language)"])
        }

        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw NSError(domain: "SpeechPlugin", code: -3, userInfo: [NSLocalizedDescriptionKey: "Unable to create recognition request"])
        }

        recognitionRequest.shouldReportPartialResults = partialResults

        // Get input node
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        // Install tap on input node
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            self.recognitionRequest?.append(buffer)
        }

        // Start recognition task
        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            var isFinal = false

            if let result = result {
                let text = result.bestTranscription.formattedString
                isFinal = result.isFinal

                if isFinal {
                    // Final result
                    self.isListening = false

                    var alternatives: [String] = []
                    for segment in result.bestTranscription.segments {
                        if !alternatives.contains(segment.substring) {
                            alternatives.append(segment.substring)
                        }
                    }

                    if let call = self.activeCall {
                        call.resolve([
                            "success": true,
                            "text": text,
                            "alternatives": [text] // iOS doesn't provide multiple alternatives the same way
                        ])
                        self.activeCall = nil
                    }

                    self.cleanup()
                } else {
                    // Partial result
                    self.notifyListeners("speechPartialResult", data: [
                        "partial": true,
                        "text": text
                    ])
                }
            }

            if let error = error {
                print("[SpeechPlugin] Speech recognition error: \(error.localizedDescription)")
                self.isListening = false

                if let call = self.activeCall {
                    call.resolve([
                        "success": false,
                        "error": error.localizedDescription,
                        "errorCode": (error as NSError).code
                    ])
                    self.activeCall = nil
                }

                self.cleanup()
            }
        }

        // Start audio engine
        audioEngine.prepare()
        try audioEngine.start()

        isListening = true
        print("[SpeechPlugin] Started listening with language: \(language)")

        // Notify JS that we're listening
        notifyListeners("speechStatus", data: [
            "status": "listening"
        ])
    }

    // MARK: - Stop Listening

    @objc func stopListening(_ call: CAPPluginCall) {
        guard isListening, let audioEngine = audioEngine else {
            call.resolve(["success": true])
            return
        }

        DispatchQueue.main.async {
            self.recognitionRequest?.endAudio()
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
            self.isListening = false

            print("[SpeechPlugin] Stopped listening")
            call.resolve(["success": true])
        }
    }

    // MARK: - Cancel

    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.cleanup()
            self.isListening = false

            if let activeCall = self.activeCall {
                activeCall.resolve([
                    "success": false,
                    "cancelled": true
                ])
                self.activeCall = nil
            }

            call.resolve(["success": true])
        }
    }

    // MARK: - Get Supported Languages

    @objc func getSupportedLanguages(_ call: CAPPluginCall) {
        let supportedLocales = SFSpeechRecognizer.supportedLocales()
        var languages: [String] = []

        for locale in supportedLocales {
            languages.append(locale.identifier)
        }

        call.resolve([
            "languages": languages.sorted(),
            "defaultLanguage": Locale.current.identifier
        ])
    }

    // MARK: - Helper Methods

    private func cleanup() {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)

        recognitionRequest?.endAudio()
        recognitionRequest = nil

        recognitionTask?.cancel()
        recognitionTask = nil

        try? AVAudioSession.sharedInstance().setActive(false)
    }

    private func speechAuthStatusToString(_ status: SFSpeechRecognizerAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "notDetermined"
        case .denied:
            return "denied"
        case .restricted:
            return "restricted"
        case .authorized:
            return "authorized"
        @unknown default:
            return "unknown"
        }
    }

    deinit {
        cleanup()
    }
}
