import Foundation

enum Localizer {
    static func text(_ en: String, _ fr: String, language: String) -> String {
        language.lowercased() == "fr" ? fr : en
    }
}
