import Foundation
import Capacitor
import Contacts

@objc(NativeContacts)
public class ContactsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeContacts"
    public let jsName = "NativeContacts"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getContacts", returnType: CAPPluginReturnPromise)
    ]

    private let contactStore = CNContactStore()

    public override func load() {
        super.load()
        print("[ContactsPlugin] Plugin loaded")
    }

    // MARK: - Check Permission

    @objc func checkPermission(_ call: CAPPluginCall) {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        let granted = status == .authorized

        print("[ContactsPlugin] Permission check: \(granted ? "GRANTED" : "DENIED")")
        call.resolve([
            "granted": granted,
            "platform": "ios",
            "status": authStatusToString(status)
        ])
    }

    // MARK: - Request Permission

    @objc func requestPermission(_ call: CAPPluginCall) {
        let status = CNContactStore.authorizationStatus(for: .contacts)

        if status == .authorized {
            print("[ContactsPlugin] Permission already granted")
            call.resolve([
                "granted": true,
                "platform": "ios"
            ])
            return
        }

        print("[ContactsPlugin] Requesting contacts permission")
        contactStore.requestAccess(for: .contacts) { granted, error in
            if let error = error {
                print("[ContactsPlugin] Permission error: \(error.localizedDescription)")
            }

            print("[ContactsPlugin] Permission callback: \(granted ? "GRANTED" : "DENIED")")
            call.resolve([
                "granted": granted,
                "platform": "ios"
            ])
        }
    }

    // MARK: - Get Contacts

    @objc func getContacts(_ call: CAPPluginCall) {
        let status = CNContactStore.authorizationStatus(for: .contacts)

        guard status == .authorized else {
            print("[ContactsPlugin] Permission not granted for reading contacts")
            call.reject("Permission not granted. Please grant contacts access.")
            return
        }

        print("[ContactsPlugin] Reading contacts from device...")

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let contacts = try self.readContacts()

                print("[ContactsPlugin] Retrieved \(contacts.count) contacts")
                call.resolve([
                    "contacts": contacts,
                    "count": contacts.count
                ])
            } catch {
                print("[ContactsPlugin] Error reading contacts: \(error.localizedDescription)")
                call.reject("Failed to read contacts: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Read Contacts

    private func readContacts() throws -> [[String: Any]] {
        let keysToFetch: [CNKeyDescriptor] = [
            CNContactIdentifierKey as CNKeyDescriptor,
            CNContactGivenNameKey as CNKeyDescriptor,
            CNContactFamilyNameKey as CNKeyDescriptor,
            CNContactPhoneNumbersKey as CNKeyDescriptor,
            CNContactEmailAddressesKey as CNKeyDescriptor
        ]

        var contacts: [[String: Any]] = []
        let request = CNContactFetchRequest(keysToFetch: keysToFetch)
        request.sortOrder = .givenName

        try contactStore.enumerateContacts(with: request) { contact, stop in
            let displayName = [contact.givenName, contact.familyName]
                .filter { !$0.isEmpty }
                .joined(separator: " ")
                .trimmingCharacters(in: .whitespaces)

            // Skip contacts without a name
            guard !displayName.isEmpty else { return }

            // Extract phone numbers
            var phones: [String] = []
            for phoneNumber in contact.phoneNumbers {
                let normalized = self.normalizePhoneNumber(phoneNumber.value.stringValue)
                if !normalized.isEmpty && !phones.contains(normalized) {
                    phones.append(normalized)
                }
            }

            // Extract email addresses
            var emails: [String] = []
            for emailAddress in contact.emailAddresses {
                let email = (emailAddress.value as String).lowercased().trimmingCharacters(in: .whitespaces)
                if !email.isEmpty && !emails.contains(email) {
                    emails.append(email)
                }
            }

            // Only include contacts with at least a phone or email
            if !phones.isEmpty || !emails.isEmpty {
                contacts.append([
                    "id": contact.identifier,
                    "name": displayName,
                    "phones": phones,
                    "emails": emails
                ])
            }
        }

        return contacts
    }

    // MARK: - Helper Methods

    private func normalizePhoneNumber(_ phone: String) -> String {
        // Keep only digits and the leading +
        var normalized = ""
        for (index, char) in phone.enumerated() {
            if char.isNumber || (index == 0 && char == "+") {
                normalized.append(char)
            }
        }
        return normalized
    }

    private func authStatusToString(_ status: CNAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "notDetermined"
        case .restricted:
            return "restricted"
        case .denied:
            return "denied"
        case .authorized:
            return "authorized"
        @unknown default:
            return "unknown"
        }
    }
}
