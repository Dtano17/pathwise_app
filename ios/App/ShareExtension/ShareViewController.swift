import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    private var sharedURL: String?
    private var sharedText: String?
    private var sharedFiles: [(url: URL, mediaType: String)] = []

    /// App Group identifier for sharing data between extension and main app
    private let appGroupIdentifier = "group.com.journalmate.app"

    private let containerView: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.systemBackground
        view.layer.cornerRadius = 16
        view.layer.masksToBounds = true
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Share to JournalMate"
        label.font = UIFont.systemFont(ofSize: 18, weight: .semibold)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private let subtitleLabel: UILabel = {
        let label = UILabel()
        label.text = "What would you like to do with this content?"
        label.font = UIFont.systemFont(ofSize: 14)
        label.textColor = .secondaryLabel
        label.textAlignment = .center
        label.numberOfLines = 2
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private lazy var planNowButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Plan This Now", for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        button.backgroundColor = UIColor(red: 147/255, green: 51/255, blue: 234/255, alpha: 1) // Purple
        button.setTitleColor(.white, for: .normal)
        button.layer.cornerRadius = 12
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(planNowTapped), for: .touchUpInside)
        return button
    }()

    private lazy var saveLaterButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Save for Later", for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        button.backgroundColor = UIColor(red: 16/255, green: 185/255, blue: 129/255, alpha: 1) // Emerald
        button.setTitleColor(.white, for: .normal)
        button.layer.cornerRadius = 12
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(saveLaterTapped), for: .touchUpInside)
        return button
    }()

    private lazy var cancelButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Cancel", for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 16)
        button.setTitleColor(.secondaryLabel, for: .normal)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        return button
    }()

    private let loadingIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .medium)
        indicator.translatesAutoresizingMaskIntoConstraints = false
        indicator.hidesWhenStopped = true
        return indicator
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        extractSharedContent()
    }

    private func setupUI() {
        view.backgroundColor = UIColor.black.withAlphaComponent(0.5)

        view.addSubview(containerView)
        containerView.addSubview(titleLabel)
        containerView.addSubview(subtitleLabel)
        containerView.addSubview(planNowButton)
        containerView.addSubview(saveLaterButton)
        containerView.addSubview(cancelButton)
        containerView.addSubview(loadingIndicator)

        NSLayoutConstraint.activate([
            containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            containerView.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.85),

            titleLabel.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 24),
            titleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 16),
            titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -16),

            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            subtitleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 16),
            subtitleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -16),

            planNowButton.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 24),
            planNowButton.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 16),
            planNowButton.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -16),
            planNowButton.heightAnchor.constraint(equalToConstant: 50),

            saveLaterButton.topAnchor.constraint(equalTo: planNowButton.bottomAnchor, constant: 12),
            saveLaterButton.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 16),
            saveLaterButton.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -16),
            saveLaterButton.heightAnchor.constraint(equalToConstant: 50),

            cancelButton.topAnchor.constraint(equalTo: saveLaterButton.bottomAnchor, constant: 16),
            cancelButton.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            cancelButton.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -24),

            loadingIndicator.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: containerView.centerYAnchor)
        ])
    }

    // MARK: - Content Extraction

    private func extractSharedContent() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            return
        }

        let dispatchGroup = DispatchGroup()

        for item in extensionItems {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                // Check for URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    dispatchGroup.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (data, error) in
                        defer { dispatchGroup.leave() }
                        if let url = data as? URL {
                            // Skip file URLs — they'll be handled by image/video/file handlers
                            if !url.isFileURL {
                                self?.sharedURL = url.absoluteString
                            }
                        }
                    }
                }
                // Check for images
                else if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    dispatchGroup.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (data, error) in
                        defer { dispatchGroup.leave() }
                        if let url = data as? URL {
                            self?.sharedFiles.append((url: url, mediaType: "image"))
                        } else if let image = data as? UIImage {
                            // Image shared directly (e.g., from Photos) — save to temp file
                            if let savedURL = self?.saveImageToSharedContainer(image) {
                                self?.sharedFiles.append((url: savedURL, mediaType: "image"))
                            }
                        }
                    }
                }
                // Check for videos/movies
                else if attachment.hasItemConformingToTypeIdentifier(UTType.movie.identifier) {
                    dispatchGroup.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.movie.identifier, options: nil) { [weak self] (data, error) in
                        defer { dispatchGroup.leave() }
                        if let url = data as? URL {
                            self?.sharedFiles.append((url: url, mediaType: "video"))
                        }
                    }
                }
                // Check for audio
                else if attachment.hasItemConformingToTypeIdentifier(UTType.audio.identifier) {
                    dispatchGroup.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.audio.identifier, options: nil) { [weak self] (data, error) in
                        defer { dispatchGroup.leave() }
                        if let url = data as? URL {
                            self?.sharedFiles.append((url: url, mediaType: "audio"))
                        }
                    }
                }
                // Check for plain text
                else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    dispatchGroup.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (data, error) in
                        defer { dispatchGroup.leave() }
                        if let text = data as? String {
                            if let url = self?.extractURL(from: text) {
                                self?.sharedURL = url
                            } else {
                                self?.sharedText = text
                            }
                        }
                    }
                }
                // Check for generic files (documents, PDFs, etc.)
                else if attachment.hasItemConformingToTypeIdentifier(UTType.data.identifier) {
                    dispatchGroup.enter()
                    attachment.loadItem(forTypeIdentifier: UTType.data.identifier, options: nil) { [weak self] (data, error) in
                        defer { dispatchGroup.leave() }
                        if let url = data as? URL {
                            self?.sharedFiles.append((url: url, mediaType: "file"))
                        }
                    }
                }
            }
        }

        dispatchGroup.notify(queue: .main) { [weak self] in
            self?.updateUIForContent()
        }
    }

    private func extractURL(from text: String) -> String? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count))

        if let match = matches?.first, let range = Range(match.range, in: text) {
            return String(text[range])
        }
        return nil
    }

    // MARK: - File Handling

    /// Save a UIImage to the shared App Group container
    private func saveImageToSharedContainer(_ image: UIImage) -> URL? {
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) else {
            print("[ShareExtension] Cannot access App Group container")
            return nil
        }

        let sharedDir = containerURL.appendingPathComponent("shared_media", isDirectory: true)
        try? FileManager.default.createDirectory(at: sharedDir, withIntermediateDirectories: true)

        let fileName = "shared_image_\(UUID().uuidString).jpg"
        let fileURL = sharedDir.appendingPathComponent(fileName)

        if let data = image.jpegData(compressionQuality: 0.85) {
            do {
                try data.write(to: fileURL)
                return fileURL
            } catch {
                print("[ShareExtension] Failed to save image: \(error)")
            }
        }
        return nil
    }

    /// Copy a file to the shared App Group container so the main app can access it
    private func copyFileToSharedContainer(_ sourceURL: URL, mediaType: String) -> URL? {
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) else {
            print("[ShareExtension] Cannot access App Group container")
            return nil
        }

        let sharedDir = containerURL.appendingPathComponent("shared_media", isDirectory: true)
        try? FileManager.default.createDirectory(at: sharedDir, withIntermediateDirectories: true)

        let ext = sourceURL.pathExtension.isEmpty ? (mediaType == "video" ? "mp4" : "dat") : sourceURL.pathExtension
        let fileName = "shared_\(mediaType)_\(UUID().uuidString).\(ext)"
        let destURL = sharedDir.appendingPathComponent(fileName)

        do {
            // Need to start accessing security-scoped resource for files from other apps
            let accessing = sourceURL.startAccessingSecurityScopedResource()
            defer {
                if accessing {
                    sourceURL.stopAccessingSecurityScopedResource()
                }
            }

            try FileManager.default.copyItem(at: sourceURL, to: destURL)
            return destURL
        } catch {
            print("[ShareExtension] Failed to copy file: \(error)")
            return nil
        }
    }

    // MARK: - UI Updates

    private func updateUIForContent() {
        if let url = sharedURL {
            if url.contains("instagram.com") {
                subtitleLabel.text = "Instagram content detected. What would you like to do?"
            } else if url.contains("tiktok.com") {
                subtitleLabel.text = "TikTok content detected. What would you like to do?"
            } else if url.contains("youtube.com") || url.contains("youtu.be") {
                subtitleLabel.text = "YouTube content detected. What would you like to do?"
            } else {
                subtitleLabel.text = "URL content detected. What would you like to do?"
            }
        } else if !sharedFiles.isEmpty {
            let imageCount = sharedFiles.filter { $0.mediaType == "image" }.count
            let videoCount = sharedFiles.filter { $0.mediaType == "video" }.count
            let audioCount = sharedFiles.filter { $0.mediaType == "audio" }.count
            let fileCount = sharedFiles.filter { $0.mediaType == "file" }.count

            var parts: [String] = []
            if imageCount > 0 { parts.append("\(imageCount) image\(imageCount > 1 ? "s" : "")") }
            if videoCount > 0 { parts.append("\(videoCount) video\(videoCount > 1 ? "s" : "")") }
            if audioCount > 0 { parts.append("\(audioCount) audio file\(audioCount > 1 ? "s" : "")") }
            if fileCount > 0 { parts.append("\(fileCount) file\(fileCount > 1 ? "s" : "")") }

            subtitleLabel.text = "\(parts.joined(separator: ", ")) shared. What would you like to do?"
        } else if sharedText != nil {
            subtitleLabel.text = "Text content shared. What would you like to do?"
        }
    }

    // MARK: - Actions

    @objc private func planNowTapped() {
        // Fire prefetch request BEFORE opening app for social media URLs
        // This starts content extraction while the app is loading
        if let url = sharedURL, isSocialMediaURL(url) {
            prefetchURL(url)
        }
        openAppWithAction(action: "plan")
    }

    @objc private func saveLaterTapped() {
        openAppWithAction(action: "save")
    }

    /// Check if the URL is from a social media platform that supports prefetching
    private func isSocialMediaURL(_ urlString: String) -> Bool {
        let lowercased = urlString.lowercased()
        return lowercased.contains("instagram.com") ||
               lowercased.contains("tiktok.com") ||
               lowercased.contains("youtube.com") ||
               lowercased.contains("youtu.be")
    }

    /// Fire a prefetch request to start extracting content in the background
    /// This is fire-and-forget - we don't wait for the response
    private func prefetchURL(_ urlString: String) {
        print("[ShareExtension] Starting prefetch for: \(urlString)")

        guard let prefetchURL = URL(string: "https://journalmate.ai/api/parse-url/prefetch") else {
            print("[ShareExtension] Invalid prefetch endpoint URL")
            return
        }

        var request = URLRequest(url: prefetchURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 5.0

        // Escape the URL for JSON
        let escapedURL = urlString
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
        let jsonBody = "{\"url\":\"\(escapedURL)\"}"

        request.httpBody = jsonBody.data(using: .utf8)

        // Fire and forget - don't wait for response
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[ShareExtension] Prefetch error: \(error.localizedDescription)")
            } else if let httpResponse = response as? HTTPURLResponse {
                print("[ShareExtension] Prefetch response: \(httpResponse.statusCode)")
            }
        }.resume()
    }

    private func openAppWithAction(action: String) {
        showLoading(true)

        // For media files, copy to shared container and store metadata
        if !sharedFiles.isEmpty {
            openAppWithMedia(action: action)
            return
        }

        let content = sharedURL ?? sharedText ?? ""

        // Construct deep link URL
        var urlComponents = URLComponents(string: "journalmate://share")!
        urlComponents.queryItems = [
            URLQueryItem(name: "action", value: action),
            URLQueryItem(name: "content", value: content)
        ]

        if let url = urlComponents.url {
            openURL(url)
        }

        // Complete the extension
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
        }
    }

    /// Handle sharing media files — copy to shared container and pass metadata via UserDefaults
    private func openAppWithMedia(action: String) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }

            var copiedFiles: [[String: String]] = []
            let primaryMediaType = self.sharedFiles.first?.mediaType ?? "file"

            for file in self.sharedFiles {
                if let copiedURL = self.copyFileToSharedContainer(file.url, mediaType: file.mediaType) {
                    copiedFiles.append([
                        "path": copiedURL.path,
                        "mediaType": file.mediaType,
                        "fileName": copiedURL.lastPathComponent
                    ])
                }
            }

            // Store share metadata in shared UserDefaults for the main app to pick up
            if let sharedDefaults = UserDefaults(suiteName: self.appGroupIdentifier) {
                let shareData: [String: Any] = [
                    "type": primaryMediaType,
                    "mediaType": primaryMediaType,
                    "files": copiedFiles,
                    "caption": self.sharedText ?? "",
                    "action": action,
                    "timestamp": Date().timeIntervalSince1970
                ]

                if let jsonData = try? JSONSerialization.data(withJSONObject: shareData),
                   let jsonString = String(data: jsonData, encoding: .utf8) {
                    sharedDefaults.set(jsonString, forKey: "pending_share_media")
                    sharedDefaults.synchronize()
                    print("[ShareExtension] Stored share media data: \(copiedFiles.count) files")
                }
            }

            DispatchQueue.main.async {
                // Open app with deep link indicating media share
                var urlComponents = URLComponents(string: "journalmate://share")!
                urlComponents.queryItems = [
                    URLQueryItem(name: "action", value: action),
                    URLQueryItem(name: "type", value: primaryMediaType),
                    URLQueryItem(name: "mediaCount", value: String(copiedFiles.count))
                ]

                if let url = urlComponents.url {
                    self.openURL(url)
                }

                // Complete the extension
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
                }
            }
        }
    }

    @objc private func cancelTapped() {
        extensionContext?.cancelRequest(withError: NSError(domain: "ShareExtension", code: 0, userInfo: nil))
    }

    private func showLoading(_ show: Bool) {
        if show {
            loadingIndicator.startAnimating()
            planNowButton.isHidden = true
            saveLaterButton.isHidden = true
            cancelButton.isHidden = true
        } else {
            loadingIndicator.stopAnimating()
            planNowButton.isHidden = false
            saveLaterButton.isHidden = false
            cancelButton.isHidden = false
        }
    }

    // Opens a URL using the shared container method
    @objc private func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return
            }
            responder = responder?.next
        }

        // Fallback: Use selector to open URL
        let selector = sel_registerName("openURL:")
        var res: UIResponder? = self
        while let r = res {
            if r.responds(to: selector) {
                r.perform(selector, with: url)
                return
            }
            res = r.next
        }
    }
}
