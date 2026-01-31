import SwiftUI

struct SettingsView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "https://irefair.com"
    @AppStorage("submissionLanguage") private var submissionLanguage: String = "en"

    @State private var draftBaseURL = ""
    @State private var statusMessage: String?

    var body: some View {
        NavigationStack {
            IRefairScreen {
                IRefairForm {
                    IRefairSection(l("API Configuration", "Configuration API")) {
                        TextField(l("Base URL", "URL de base"), text: $draftBaseURL)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        HStack {
                            Button(l("Save", "Enregistrer")) {
                                let cleaned = Validator.sanitizeBaseURL(draftBaseURL)
                                apiBaseURL = cleaned
                                statusMessage = l("Saved.", "Enregistré.")
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                            Spacer()
                            Button(l("Reset", "Réinitialiser")) {
                                apiBaseURL = "https://irefair.com"
                                draftBaseURL = apiBaseURL
                                statusMessage = l("Reset to default.", "Réinitialisé.")
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                        }
                        Text(l("Use your production URL or local dev server (e.g. http://localhost:3000).",
                               "Utilisez l’URL de production ou un serveur local (ex. http://localhost:3000)."))
                            .font(Theme.font(.caption))
                            .foregroundStyle(Theme.muted)
                    }

                    IRefairSection(l("Default language", "Langue par défaut")) {
                        Picker(l("Language", "Langue"), selection: $submissionLanguage) {
                            Text(l("English", "Anglais")).tag("en")
                            Text(l("French", "Français")).tag("fr")
                        }
                        .pickerStyle(.segmented)
                    }

                    IRefairSection(l("Legal", "Mentions légales")) {
                        if let privacyUrl = URL(string: "https://irefair.com/privacy") {
                            Link(l("Privacy Policy", "Politique de confidentialité"), destination: privacyUrl)
                        }
                        if let termsUrl = URL(string: "https://irefair.com/terms") {
                            Link(l("Terms of Service", "Conditions d’utilisation"), destination: termsUrl)
                        }
                    }

                    if let statusMessage {
                        IRefairSection {
                            StatusBanner(text: statusMessage ?? "", style: .success)
                        }
                    }

                    IRefairSection(l("App data", "Données de l’app")) {
                        Button(l("Clear saved referrer token", "Effacer le jeton enregistré")) {
                            KeychainStore.delete(key: "referrerPortalToken")
                            statusMessage = l("Cleared referrer token.", "Jeton de référent effacé.")
                        }
                        .buttonStyle(IRefairGhostButtonStyle())
                    }
                }
                .navigationTitle(l("Settings", "Paramètres"))
                .onAppear {
                    draftBaseURL = apiBaseURL
                }
            }
        }
    }

    private func l(_ en: String, _ fr: String) -> String {
        Localizer.text(en, fr, language: submissionLanguage)
    }
}

#Preview {
    SettingsView()
        .environmentObject(NetworkMonitor())
}
