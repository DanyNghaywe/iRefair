import Foundation

enum AppLocale {
    static var languageCode: String {
        let preferred = (Bundle.main.preferredLocalizations.first ?? Locale.preferredLanguages.first ?? "en").lowercased()
        return preferred.hasPrefix("fr") ? "fr" : "en"
    }
}
