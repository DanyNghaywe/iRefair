import SwiftUI

struct ReferrerPortalView: View {
    private let apiBaseURL: String = APIConfig.baseURL

    @EnvironmentObject private var networkMonitor: NetworkMonitor

    @State private var storedToken: String = ""
    @State private var tokenInput = ""
    @State private var referrer: ReferrerSummary?
    @State private var applicants: [ReferrerApplicant] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?

    @State private var selectedApplicant: ReferrerApplicant?
    private let loadingRows = 1

    var body: some View {
        IRefairForm {
            IRefairCardHeader(
                eyebrow: l("Referrer portal"),
                title: l("Track your referrals"),
                lead: l("Review candidates, download CVs, and manage your referrals.")
            )

            if !networkMonitor.isConnected {
                IRefairSection {
                    StatusBanner(text: l("You're offline. Connect to the internet to load portal data."), style: .warning)
                }
            }

            IRefairSection(l("Access token")) {
                IRefairField(l("Paste token or portal link")) {
                    IRefairTextField("", text: $tokenInput)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .accessibilityLabel(l("Paste token or portal link"))
                }
                HStack(spacing: 12) {
                    Button(l("Clear")) {
                        storedToken = ""
                        tokenInput = ""
                        referrer = nil
                        applicants = []
                        errorMessage = nil
                        statusMessage = nil
                        KeychainStore.delete(key: "referrerPortalToken")
                    }
                    .buttonStyle(IRefairGhostButtonStyle(fillWidth: true))
                    .disabled(tokenInput.isEmpty && storedToken.isEmpty && referrer == nil && applicants.isEmpty)

                    Button(l("Load portal data")) {
                        Task { await loadPortal() }
                    }
                    .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: true))
                    .disabled(isLoading || !networkMonitor.isConnected)
                }
            }

            if let referrer {
                IRefairSection(l("Referrer")) {
                    Text("\(referrer.firstName) \(referrer.lastName)")
                    Text(referrer.email)
                        .foregroundStyle(Theme.muted)
                    Text("\(l("ID")): \(referrer.irref)")
                        .font(Theme.font(.caption))
                        .foregroundStyle(Theme.muted)
                }
            }

            if isLoading {
                IRefairSection(l("Applicants")) {
                    loadingApplicantsRows
                }
            } else if !applicants.isEmpty {
                IRefairSection(l("Applicants")) {
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
                                Text("\(l("Status")): \(status)")
                                    .font(Theme.font(.caption))
                                    .foregroundStyle(Theme.muted)
                            }
                            Button(l("Send feedback")) {
                                selectedApplicant = applicant
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                        }
                        .padding(.vertical, 4)
                    }
                }
            } else if referrer != nil {
                IRefairSection {
                    Text(l("No applicants assigned yet."))
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

    private var loadingApplicantsRows: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(0..<loadingRows, id: \.self) { index in
                HStack(alignment: .top, spacing: 12) {
                    IRefairSkeletonBlock(width: 32, height: 32, cornerRadius: 16, delay: Double(index) * 0.03)

                    VStack(alignment: .leading, spacing: 6) {
                        IRefairSkeletonBlock(width: 180, height: 16, cornerRadius: 8, delay: Double(index) * 0.03 + 0.02)
                        IRefairSkeletonBlock(width: 140, height: 12, cornerRadius: 999, delay: Double(index) * 0.03 + 0.04)
                        IRefairSkeletonBlock(width: 118, height: 10, cornerRadius: 999, delay: Double(index) * 0.03 + 0.06)
                    }

                    Spacer(minLength: 8)

                    IRefairSkeletonBlock(width: 96, height: 32, cornerRadius: 12, delay: Double(index) * 0.03 + 0.08)
                }
                .padding(.vertical, 8)

                if index < loadingRows - 1 {
                    Divider()
                        .background(Color.white.opacity(0.12))
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(l("Loading..."))
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

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    @MainActor
    private func loadPortal() async {
        errorMessage = nil
        statusMessage = nil
        let token = extractToken(from: tokenInput.isEmpty ? storedToken : tokenInput)
        guard !token.isEmpty else {
            errorMessage = l("Enter a token first.")
            return
        }
        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            errorMessage = l("App configuration is missing API base URL.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.")
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
            statusMessage = String.localizedStringWithFormat(l("Loaded %d applicants."), applicants.count)
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
