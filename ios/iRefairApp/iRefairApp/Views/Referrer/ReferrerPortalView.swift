import SwiftUI

struct ReferrerPortalView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "https://irefair.com"
    @AppStorage("submissionLanguage") private var submissionLanguage: String = "en"

    @EnvironmentObject private var networkMonitor: NetworkMonitor

    @State private var storedToken: String = ""
    @State private var tokenInput = ""
    @State private var referrer: ReferrerSummary?
    @State private var applicants: [ReferrerApplicant] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?

    @State private var selectedApplicant: ReferrerApplicant?

    var body: some View {
        IRefairForm {
            if !networkMonitor.isConnected {
                IRefairSection {
                    StatusBanner(text: l("You're offline. Connect to the internet to load portal data.", "Vous êtes hors ligne. Connectez-vous à Internet pour charger le portail."), style: .warning)
                }
            }

            IRefairSection(l("Access token", "Jeton d’accès")) {
                TextField(l("Paste token or portal link", "Collez le jeton ou le lien du portail"), text: $tokenInput)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                HStack {
                    Button(l("Save token", "Enregistrer le jeton")) {
                        let token = extractToken(from: tokenInput)
                        storedToken = token
                        tokenInput = token
                        if !token.isEmpty {
                            KeychainStore.save(token, key: "referrerPortalToken")
                        }
                    }
                    .buttonStyle(IRefairGhostButtonStyle())
                    Spacer()
                    Button(l("Clear", "Effacer")) {
                        storedToken = ""
                        tokenInput = ""
                        referrer = nil
                        applicants = []
                        KeychainStore.delete(key: "referrerPortalToken")
                    }
                    .buttonStyle(IRefairGhostButtonStyle())
                }
                Button(l("Load portal data", "Charger les données du portail")) {
                    Task { await loadPortal() }
                }
                .buttonStyle(IRefairPrimaryButtonStyle())
                .disabled(isLoading || !networkMonitor.isConnected)
            }

            if let referrer {
                IRefairSection(l("Referrer", "Référent")) {
                    Text("\(referrer.firstName) \(referrer.lastName)")
                    Text(referrer.email)
                        .foregroundStyle(Theme.muted)
                    Text("\(l("ID", "ID")): \(referrer.irref)")
                        .font(Theme.font(.caption))
                        .foregroundStyle(Theme.muted)
                }
            }

            if isLoading {
                IRefairSection {
                    ProgressView(l("Loading...", "Chargement..."))
                }
            }

            if !applicants.isEmpty {
                IRefairSection(l("Applicants", "Candidats")) {
                    ForEach(applicants) { applicant in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(applicant.displayName)
                                .font(Theme.font(.headline, weight: .semibold))
                            if let email = applicant.email {
                                Text(email)
                                    .font(Theme.font(.subheadline))
                                    .foregroundStyle(Theme.muted)
                            }
                            if let status = applicant.status {
                                Text("\(l("Status", "Statut")): \(status)")
                                    .font(Theme.font(.caption))
                                    .foregroundStyle(Theme.muted)
                            }
                            Button(l("Send feedback", "Envoyer un avis")) {
                                selectedApplicant = applicant
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                        }
                        .padding(.vertical, 4)
                    }
                }
            } else if referrer != nil && !isLoading {
                IRefairSection {
                    Text(l("No applicants assigned yet.", "Aucun candidat assigné pour l'instant."))
                        .foregroundStyle(Theme.muted)
                }
            }

            if let errorMessage {
                IRefairSection {
                    StatusBanner(text: errorMessage, style: .error)
                }
            }

            if let statusMessage {
                IRefairSection {
                    StatusBanner(text: statusMessage, style: .success)
                }
            }
        }
        .onAppear {
            let token = KeychainStore.read(key: "referrerPortalToken") ?? ""
            storedToken = token
            if tokenInput.isEmpty {
                tokenInput = token
            }
        }
        .sheet(item: $selectedApplicant) { applicant in
            FeedbackSheet(applicant: applicant, token: storedToken) {
                Task { await loadPortal() }
            }
        }
    }

    private func extractToken(from input: String) -> String {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return trimmed
        }
        if let token = components.queryItems?.first(where: { $0.name.lowercased() == "token" })?.value {
            return token
        }
        return trimmed
    }

    private func l(_ en: String, _ fr: String) -> String {
        Localizer.text(en, fr, language: submissionLanguage)
    }

    @MainActor
    private func loadPortal() async {
        errorMessage = nil
        statusMessage = nil
        let token = extractToken(from: tokenInput.isEmpty ? storedToken : tokenInput)
        guard !token.isEmpty else {
            errorMessage = l("Enter a token first.", "Entrez d'abord un jeton.")
            return
        }
        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            errorMessage = l("Set your API base URL in Settings first.", "Définissez d'abord l'URL de base de l'API dans Paramètres.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.", "Vous êtes hors ligne. Connectez-vous à Internet et réessayez.")
            return
        }
        storedToken = token
        tokenInput = token
        KeychainStore.save(token, key: "referrerPortalToken")

        isLoading = true
        defer { isLoading = false }

        do {
            let response = try await APIClient.loadReferrerPortal(baseURL: apiBaseURL, token: token)
            referrer = response.referrer
            applicants = response.applicants ?? []
            statusMessage = l("Loaded \(applicants.count) applicants.", "Chargé \(applicants.count) candidats.")
            Telemetry.track("referrer_portal_loaded", properties: ["count": "\(applicants.count)"])
        } catch {
            Telemetry.capture(error)
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    ReferrerPortalView()
        .environmentObject(NetworkMonitor())
}
