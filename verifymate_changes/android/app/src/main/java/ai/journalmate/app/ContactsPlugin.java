package ai.journalmate.app;

import android.Manifest;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.ContactsContract;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(
    name = "NativeContacts",
    permissions = {
        @Permission(
            strings = { Manifest.permission.READ_CONTACTS },
            alias = "contacts"
        )
    }
)
public class ContactsPlugin extends Plugin {
    private static final String TAG = "ContactsPlugin";

    /**
     * Check if contacts permission is granted
     */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject result = new JSObject();

        boolean granted = ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED;

        result.put("granted", granted);
        result.put("platform", "android");

        Log.d(TAG, "Permission check: " + (granted ? "GRANTED" : "DENIED"));
        call.resolve(result);
    }

    /**
     * Request contacts permission
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.READ_CONTACTS
            ) == PackageManager.PERMISSION_GRANTED) {
            // Permission already granted
            Log.d(TAG, "Permission already granted");
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("platform", "android");
            call.resolve(result);
            return;
        }

        // Request permission using Capacitor's built-in permission handling
        Log.d(TAG, "Requesting READ_CONTACTS permission");
        requestPermissionForAlias("contacts", call, "permissionCallback");
    }

    /**
     * Callback after permission request
     */
    @PluginMethod
    public void permissionCallback(PluginCall call) {
        JSObject result = new JSObject();

        boolean granted = ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED;

        result.put("granted", granted);
        result.put("platform", "android");

        Log.d(TAG, "Permission callback: " + (granted ? "GRANTED" : "DENIED"));
        call.resolve(result);
    }

    /**
     * Get all contacts from the device
     * Returns an array of contacts with name, emails, and phone numbers
     */
    @PluginMethod
    public void getContacts(PluginCall call) {
        // Check permission first
        if (ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.READ_CONTACTS
            ) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Permission not granted for reading contacts");
            call.reject("Permission not granted. Please grant contacts access.");
            return;
        }

        Log.d(TAG, "Reading contacts from device...");

        try {
            List<JSObject> contacts = readContacts();

            JSObject result = new JSObject();
            JSArray contactsArray = new JSArray();
            for (JSObject contact : contacts) {
                contactsArray.put(contact);
            }
            result.put("contacts", contactsArray);
            result.put("count", contacts.size());

            Log.d(TAG, "Retrieved " + contacts.size() + " contacts");
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error reading contacts: " + e.getMessage());
            call.reject("Failed to read contacts: " + e.getMessage());
        }
    }

    /**
     * Read all contacts from the ContentResolver
     */
    private List<JSObject> readContacts() {
        Map<String, ContactData> contactMap = new HashMap<>();
        ContentResolver resolver = getContext().getContentResolver();

        // First, get all contacts with their IDs and display names
        Cursor contactCursor = resolver.query(
            ContactsContract.Contacts.CONTENT_URI,
            new String[]{
                ContactsContract.Contacts._ID,
                ContactsContract.Contacts.DISPLAY_NAME_PRIMARY,
                ContactsContract.Contacts.HAS_PHONE_NUMBER
            },
            null,
            null,
            ContactsContract.Contacts.DISPLAY_NAME_PRIMARY + " ASC"
        );

        if (contactCursor != null) {
            while (contactCursor.moveToNext()) {
                String contactId = contactCursor.getString(
                    contactCursor.getColumnIndexOrThrow(ContactsContract.Contacts._ID)
                );
                String displayName = contactCursor.getString(
                    contactCursor.getColumnIndexOrThrow(ContactsContract.Contacts.DISPLAY_NAME_PRIMARY)
                );

                if (displayName != null && !displayName.trim().isEmpty()) {
                    ContactData contact = new ContactData();
                    contact.id = contactId;
                    contact.name = displayName.trim();
                    contactMap.put(contactId, contact);
                }
            }
            contactCursor.close();
        }

        // Get phone numbers for all contacts
        Cursor phoneCursor = resolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            new String[]{
                ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                ContactsContract.CommonDataKinds.Phone.NUMBER
            },
            null,
            null,
            null
        );

        if (phoneCursor != null) {
            while (phoneCursor.moveToNext()) {
                String contactId = phoneCursor.getString(
                    phoneCursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
                );
                String phoneNumber = phoneCursor.getString(
                    phoneCursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.NUMBER)
                );

                ContactData contact = contactMap.get(contactId);
                if (contact != null && phoneNumber != null && !phoneNumber.trim().isEmpty()) {
                    // Normalize phone number
                    String normalized = normalizePhoneNumber(phoneNumber);
                    if (!contact.phones.contains(normalized)) {
                        contact.phones.add(normalized);
                    }
                }
            }
            phoneCursor.close();
        }

        // Get email addresses for all contacts
        Cursor emailCursor = resolver.query(
            ContactsContract.CommonDataKinds.Email.CONTENT_URI,
            new String[]{
                ContactsContract.CommonDataKinds.Email.CONTACT_ID,
                ContactsContract.CommonDataKinds.Email.ADDRESS
            },
            null,
            null,
            null
        );

        if (emailCursor != null) {
            while (emailCursor.moveToNext()) {
                String contactId = emailCursor.getString(
                    emailCursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Email.CONTACT_ID)
                );
                String email = emailCursor.getString(
                    emailCursor.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Email.ADDRESS)
                );

                ContactData contact = contactMap.get(contactId);
                if (contact != null && email != null && !email.trim().isEmpty()) {
                    String normalizedEmail = email.trim().toLowerCase();
                    if (!contact.emails.contains(normalizedEmail)) {
                        contact.emails.add(normalizedEmail);
                    }
                }
            }
            emailCursor.close();
        }

        // Convert to JSObject list
        List<JSObject> result = new ArrayList<>();
        for (ContactData contact : contactMap.values()) {
            // Only include contacts that have at least a phone or email
            if (!contact.phones.isEmpty() || !contact.emails.isEmpty()) {
                JSObject obj = new JSObject();
                obj.put("id", contact.id);
                obj.put("name", contact.name);

                JSArray phonesArray = new JSArray();
                for (String phone : contact.phones) {
                    phonesArray.put(phone);
                }
                obj.put("phones", phonesArray);

                JSArray emailsArray = new JSArray();
                for (String email : contact.emails) {
                    emailsArray.put(email);
                }
                obj.put("emails", emailsArray);

                result.add(obj);
            }
        }

        return result;
    }

    /**
     * Normalize phone number by removing non-digit characters
     */
    private String normalizePhoneNumber(String phone) {
        if (phone == null) return "";
        // Keep only digits and the leading +
        StringBuilder normalized = new StringBuilder();
        for (int i = 0; i < phone.length(); i++) {
            char c = phone.charAt(i);
            if (Character.isDigit(c) || (i == 0 && c == '+')) {
                normalized.append(c);
            }
        }
        return normalized.toString();
    }

    /**
     * Internal class to hold contact data during processing
     */
    private static class ContactData {
        String id;
        String name;
        Set<String> phones = new HashSet<>();
        Set<String> emails = new HashSet<>();
    }
}
