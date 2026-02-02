import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    
    private var sharedURL: String?
    private var sharedText: String?
    
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
    
    private func extractSharedContent() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            return
        }
        
        for item in extensionItems {
            guard let attachments = item.attachments else { continue }
            
            for attachment in attachments {
                // Check for URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (data, error) in
                        if let url = data as? URL {
                            self?.sharedURL = url.absoluteString
                            DispatchQueue.main.async {
                                self?.updateUIForContent()
                            }
                        }
                    }
                }
                // Check for text
                else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] (data, error) in
                        if let text = data as? String {
                            // Check if text contains a URL
                            if let url = self?.extractURL(from: text) {
                                self?.sharedURL = url
                            } else {
                                self?.sharedText = text
                            }
                            DispatchQueue.main.async {
                                self?.updateUIForContent()
                            }
                        }
                    }
                }
            }
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
        } else if sharedText != nil {
            subtitleLabel.text = "Text content shared. What would you like to do?"
        }
    }
    
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

        let content = sharedURL ?? sharedText ?? ""

        // Construct deep link URL
        var urlComponents = URLComponents(string: "journalmate://share")!
        urlComponents.queryItems = [
            URLQueryItem(name: "action", value: action),
            URLQueryItem(name: "content", value: content)
        ]

        if let url = urlComponents.url {
            // Open the main app with the deep link
            openURL(url)
        }

        // Complete the extension
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
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
