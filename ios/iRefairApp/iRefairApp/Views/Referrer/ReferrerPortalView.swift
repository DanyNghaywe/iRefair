import SwiftUI

struct ReferrerPortalView: View {
    private enum MessageTarget: Hashable {
        case sendLink
        case tokenSignIn
        case loadPortal
        case signOut
        case global
    }

    private struct InlineMessage {
        let text: String
        let style: StatusBanner.Style
    }

    private let apiBaseURL: String = APIConfig.baseURL
    private let refreshTokenKey = "referrerPortalRefreshToken"
    private let legacyPortalTokenKey = "referrerPortalToken"

    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var networkMonitor: NetworkMonitor

    @State private var accessToken = ""
    @State private var loginEmail = ""
    @State private var portalTokenInput = ""
    @State private var didBootstrapSession = false
    @State private var isRequestingLink = false
    @State private var isSigningOut = false

    @State private var referrer: ReferrerSummary?
    @State private var applicants: [ReferrerApplicant] = []
    @State private var totalReferrals: Int?
    @State private var isLoading = false
    @State private var messages: [MessageTarget: InlineMessage] = [:]

    @State private var selectedApplicant: ReferrerApplicant?
    private let loadingRows = 1
    private let referrerMetaSingleColumnBreakpoint: CGFloat = 340

    private var isAuthenticated: Bool {
        !accessToken.isEmpty
    }

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

            if isAuthenticated {
                authenticatedSessionSection
            } else {
                signInSection
            }

            if let referrer {
                referrerMeta(referrer)
            }

            if isLoading {
                applicationsBlock {
                    loadingApplicantsRows
                }
            } else if !applicants.isEmpty {
                applicationsBlock {
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
                applicationsBlock {
                    IRefairTableEmptyState(
                        title: l("No applications assigned"),
                        description: l("Candidate applications will appear here once they're assigned to you. Check back soon for new referrals to review."),
                        tone: .darkOnLight
                    )
                }
            }

            if let globalMessage = messages[.global] {
                IRefairSection {
                    StatusBanner(text: globalMessage.text, style: globalMessage.style)
                }
            }
        }
        .onAppear {
            guard !didBootstrapSession else { return }
            didBootstrapSession = true
            Task { await bootstrapSession() }
        }
        .onChange(of: appState.pendingReferrerPortalToken) { newValue in
            guard newValue != nil else { return }
            Task { await bootstrapSession() }
        }
        .sheet(item: $selectedApplicant) { applicant in
            FeedbackSheet(applicant: applicant, token: accessToken) {
                Task { await loadPortal(messageTarget: nil) }
            }
        }
    }

    private var signInSection: some View {
        IRefairSection(l("Sign in to your portal")) {
            IRefairField(l("Email")) {
                IRefairTextField(l("your.email@example.com"), text: $loginEmail)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
            }
            HStack(spacing: 12) {
                Button {
                    Task { await requestPortalAccessEmail() }
                } label: {
                    HStack(spacing: 8) {
                        if isRequestingLink {
                            ProgressView()
                                .tint(.white)
                                .scaleEffect(0.9)
                        }
                        Text(isRequestingLink ? l("Sending...") : l("Send portal access email"))
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: true))
                .disabled(isRequestingLink || !networkMonitor.isConnected)
            }

            if let message = messages[.sendLink] {
                StatusBanner(text: message.text, style: message.style)
            }

            Text(l("We'll send another email with your \"Open portal\" link and token."))
                .font(Theme.font(.caption))
                .foregroundStyle(Color.white.opacity(0.86))

            HStack(spacing: 12) {
                Rectangle()
                    .fill(Color.white.opacity(0.34))
                    .frame(height: 1)
                    .frame(maxWidth: .infinity)
                Text(l("OR"))
                    .font(Theme.font(size: 11, weight: .bold))
                    .foregroundStyle(Color.white.opacity(0.78))
                    .kerning(1.4)
                Rectangle()
                    .fill(Color.white.opacity(0.34))
                    .frame(height: 1)
                    .frame(maxWidth: .infinity)
            }
            .padding(.vertical, 6)

            IRefairField(l("Paste token or portal link")) {
                IRefairTextField("", text: $portalTokenInput)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .accessibilityLabel(l("Paste token or portal link"))
            }
            HStack(spacing: 12) {
                Button(l("Sign in with token")) {
                    Task { await signInWithPortalToken() }
                }
                .buttonStyle(IRefairGhostButtonStyle(fillWidth: true))
                .disabled(isRequestingLink || !networkMonitor.isConnected)
            }

            if let message = messages[.tokenSignIn] {
                StatusBanner(text: message.text, style: message.style)
            }
        }
    }

    private var authenticatedSessionSection: some View {
        IRefairSection(l("Session")) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 8) {
                    Button(l("Load portal data")) {
                        Task { await loadPortal(messageTarget: .loadPortal) }
                    }
                    .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: true))
                    .disabled(isLoading || !networkMonitor.isConnected || isSigningOut)

                    if let message = messages[.loadPortal] {
                        StatusBanner(text: message.text, style: message.style)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 8) {
                    Button(l("Sign out")) {
                        Task { await signOut() }
                    }
                    .buttonStyle(IRefairGhostButtonStyle(fillWidth: true))
                    .disabled(isSigningOut)

                    if let message = messages[.signOut] {
                        StatusBanner(text: message.text, style: message.style)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func applicationsSection<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        IRefairSection {
            content()
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func applicationsBlock<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            applicationsHeader
            applicationsSection {
                content()
            }
        }
    }

    private var applicationsHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                Text(l("Applications"))
                    .font(Theme.font(size: 12, weight: .bold))
                    .foregroundStyle(Color.white.opacity(0.85))
                    .textCase(.uppercase)
                    .kerning(2.4)
                Text("\(activeReferralsCount) \(l("active referrals"))")
                    .font(Theme.font(size: 14))
                    .foregroundStyle(Color.white.opacity(0.75))
            }

            HStack(alignment: .center, spacing: 8) {
                Text("\(totalReferralsCount) \(l("total"))")
                    .font(Theme.font(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 14)
                    .frame(minHeight: 36)
                    .background(
                        Capsule(style: .continuous)
                            .fill(Color.white.opacity(0.7))
                            .overlay(
                                Capsule(style: .continuous)
                                    .stroke(Color(hex: 0x0F172A).opacity(0.12), lineWidth: 1)
                            )
                    )
                    .shadow(color: Color(hex: 0x0F172A).opacity(0.06), radius: 6, x: 0, y: 2)
                    .fixedSize(horizontal: true, vertical: false)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var activeReferralsCount: Int {
        applicants.count
    }

    private var totalReferralsCount: Int {
        totalReferrals ?? applicants.count
    }

    private var referrerMetaColumns: [GridItem] {
        if UIScreen.main.bounds.width <= referrerMetaSingleColumnBreakpoint {
            return [GridItem(.flexible(minimum: 0), spacing: 16, alignment: .leading)]
        }
        return [
            GridItem(.flexible(minimum: 0), spacing: 16, alignment: .leading),
            GridItem(.flexible(minimum: 0), spacing: 16, alignment: .leading),
        ]
    }

    private func referrerMeta(_ referrer: ReferrerSummary) -> some View {
        LazyVGrid(columns: referrerMetaColumns, alignment: .leading, spacing: 12) {
            referrerMetaItem(
                title: l("Referrer"),
                value: "\(referrer.displayName) - \(referrer.irref)"
            )
            referrerMetaItem(
                title: l("Email"),
                value: referrer.email.isEmpty ? l("No email on file") : referrer.email
            )
            if let company = referrer.company?.trimmingCharacters(in: .whitespacesAndNewlines), !company.isEmpty {
                referrerMetaItem(
                    title: l("Company"),
                    value: company
                )
            }
            referrerMetaItem(
                title: l("Total"),
                value: "\(totalReferralsCount)"
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 2)
    }

    private func referrerMetaItem(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(Theme.font(size: 11, weight: .bold))
                .foregroundStyle(Color.white.opacity(0.82))
                .textCase(.uppercase)
                .kerning(2.0)
            Text(value)
                .font(Theme.font(size: 15, weight: .semibold))
                .foregroundStyle(Color.white)
                .lineLimit(nil)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var loadingApplicantsRows: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(0..<loadingRows, id: \.self) { index in
                HStack(alignment: .top, spacing: 12) {
                    IRefairSkeletonBlock(width: 32, height: 32, cornerRadius: 16, delay: Double(index) * 0.03)

                    VStack(alignment: .leading, spacing: 6) {
                        IRefairSkeletonBlock(height: 16, cornerRadius: 8, delay: Double(index) * 0.03 + 0.02)
                        loadingApplicantTextLine(height: 12, trailingInset: 44, delay: Double(index) * 0.03 + 0.04)
                        loadingApplicantTextLine(height: 10, trailingInset: 68, delay: Double(index) * 0.03 + 0.06)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    IRefairSkeletonBlock(width: 72, height: 32, cornerRadius: 12, delay: Double(index) * 0.03 + 0.08)
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

    private func loadingApplicantTextLine(height: CGFloat, trailingInset: CGFloat, delay: Double) -> some View {
        HStack(spacing: 0) {
            IRefairSkeletonBlock(height: height, cornerRadius: 999, delay: delay)
            Spacer(minLength: trailingInset)
        }
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    private func setMessage(_ text: String, style: StatusBanner.Style, for target: MessageTarget) {
        messages[target] = InlineMessage(text: text, style: style)
    }

    private func clearMessage(for target: MessageTarget) {
        messages.removeValue(forKey: target)
    }

    private func clearPortalData() {
        referrer = nil
        applicants = []
        totalReferrals = nil
        selectedApplicant = nil
    }

    @MainActor
    private func bootstrapSession() async {
        clearMessage(for: .global)

        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            setMessage(l("App configuration is missing API base URL."), style: .error, for: .global)
            return
        }

        if let pendingPortalToken = appState.consumePendingReferrerPortalToken() {
            await exchangeSession(portalToken: pendingPortalToken, messageTarget: .global)
            return
        }

        if isAuthenticated { return }

        _ = await refreshSession()
    }

    @MainActor
    private func requestPortalAccessEmail() async {
        clearMessage(for: .sendLink)

        let email = loginEmail.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !email.isEmpty else {
            setMessage(l("Enter a valid email."), style: .error, for: .sendLink)
            return
        }

        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            setMessage(l("App configuration is missing API base URL."), style: .error, for: .sendLink)
            return
        }

        guard networkMonitor.isConnected else {
            setMessage(l("You're offline. Connect to the internet and try again."), style: .error, for: .sendLink)
            return
        }

        isRequestingLink = true
        defer { isRequestingLink = false }

        do {
            let response = try await APIClient.requestReferrerLink(baseURL: apiBaseURL, email: email)
            let successText = response.message?.trimmingCharacters(in: .whitespacesAndNewlines)
            if let successText, !successText.isEmpty {
                setMessage(successText, style: .success, for: .sendLink)
            } else {
                setMessage(
                    l("Request received. If your account is accepted, we'll email your portal link and token."),
                    style: .info,
                    for: .sendLink
                )
            }
        } catch {
            Telemetry.capture(error)
            setMessage(error.localizedDescription, style: .error, for: .sendLink)
        }
    }

    private func extractPortalToken(from input: String) -> String {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return "" }
        guard let url = URL(string: trimmed),
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return trimmed
        }
        if let token = components.queryItems?.first(where: { $0.name.lowercased() == "token" || $0.name.lowercased() == "referrertoken" })?.value {
            return token.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return trimmed
    }

    @MainActor
    private func signInWithPortalToken() async {
        clearMessage(for: .tokenSignIn)

        let token = extractPortalToken(from: portalTokenInput)
        guard !token.isEmpty else {
            setMessage(l("Enter a token first."), style: .error, for: .tokenSignIn)
            return
        }

        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            setMessage(l("App configuration is missing API base URL."), style: .error, for: .tokenSignIn)
            return
        }

        guard networkMonitor.isConnected else {
            setMessage(l("You're offline. Connect to the internet and try again."), style: .error, for: .tokenSignIn)
            return
        }

        await exchangeSession(portalToken: token, messageTarget: .tokenSignIn)
    }

    @MainActor
    private func exchangeSession(portalToken: String, messageTarget: MessageTarget?) async {
        if let messageTarget {
            clearMessage(for: messageTarget)
        }
        clearMessage(for: .signOut)

        guard networkMonitor.isConnected else {
            if let messageTarget {
                setMessage(l("You're offline. Connect to the internet and try again."), style: .error, for: messageTarget)
            }
            return
        }

        do {
            let response = try await APIClient.exchangeReferrerMobileSession(
                baseURL: apiBaseURL,
                portalToken: portalToken
            )

            guard let newAccessToken = response.accessToken,
                  !newAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let newRefreshToken = response.refreshToken,
                  !newRefreshToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw APIError(message: l("Unable to establish session. Please try again."))
            }

            accessToken = newAccessToken
            _ = KeychainStore.save(newRefreshToken, key: refreshTokenKey)
            KeychainStore.delete(key: legacyPortalTokenKey)

            if let referrer = response.referrer {
                self.referrer = referrer
            }

            if let messageTarget {
                setMessage(l("Signed in. Loading portal data..."), style: .success, for: messageTarget)
            }
            await loadPortal(messageTarget: messageTarget)
        } catch {
            Telemetry.capture(error)
            clearPortalData()
            accessToken = ""
            KeychainStore.delete(key: refreshTokenKey)
            if let messageTarget {
                setMessage(error.localizedDescription, style: .error, for: messageTarget)
            }
        }
    }

    @MainActor
    private func refreshSession() async -> Bool {
        let refreshToken = (KeychainStore.read(key: refreshTokenKey) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !refreshToken.isEmpty else {
            return false
        }

        do {
            let response = try await APIClient.refreshReferrerMobileSession(baseURL: apiBaseURL, refreshToken: refreshToken)
            guard let newAccessToken = response.accessToken,
                  !newAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let newRefreshToken = response.refreshToken,
                  !newRefreshToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw APIError(message: l("Session expired. Please sign in again."))
            }

            accessToken = newAccessToken
            _ = KeychainStore.save(newRefreshToken, key: refreshTokenKey)
            return true
        } catch {
            Telemetry.capture(error)
            accessToken = ""
            clearPortalData()
            KeychainStore.delete(key: refreshTokenKey)
            return false
        }
    }

    @MainActor
    private func signOut() async {
        clearMessage(for: .signOut)

        isSigningOut = true
        defer { isSigningOut = false }

        let refreshToken = (KeychainStore.read(key: refreshTokenKey) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if !refreshToken.isEmpty {
            _ = try? await APIClient.logoutReferrerMobileSession(baseURL: apiBaseURL, refreshToken: refreshToken)
        }

        accessToken = ""
        clearPortalData()
        KeychainStore.delete(key: refreshTokenKey)
        KeychainStore.delete(key: legacyPortalTokenKey)
    }

    @MainActor
    private func loadPortal(messageTarget: MessageTarget? = .loadPortal) async {
        if let messageTarget {
            clearMessage(for: messageTarget)
        }

        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            if let messageTarget {
                setMessage(l("App configuration is missing API base URL."), style: .error, for: messageTarget)
            }
            return
        }
        guard networkMonitor.isConnected else {
            if let messageTarget {
                setMessage(l("You're offline. Connect to the internet and try again."), style: .error, for: messageTarget)
            }
            return
        }

        if accessToken.isEmpty {
            let refreshed = await refreshSession()
            if !refreshed {
                if let messageTarget {
                    setMessage(l("Session expired. Please sign in again."), style: .error, for: messageTarget)
                }
                return
            }
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let response = try await APIClient.loadReferrerPortal(baseURL: apiBaseURL, token: accessToken)
            referrer = response.referrer
            applicants = response.applicants ?? []
            totalReferrals = response.total
            if let messageTarget {
                setMessage(
                    String.localizedStringWithFormat(l("Loaded %d applicants."), applicants.count),
                    style: .success,
                    for: messageTarget
                )
            }
            Telemetry.track("referrer_portal_loaded", properties: ["count": "\(applicants.count)"])
        } catch {
            let refreshed = await refreshSession()
            if refreshed {
                do {
                    let retryResponse = try await APIClient.loadReferrerPortal(baseURL: apiBaseURL, token: accessToken)
                    referrer = retryResponse.referrer
                    applicants = retryResponse.applicants ?? []
                    totalReferrals = retryResponse.total
                    if let messageTarget {
                        setMessage(
                            String.localizedStringWithFormat(l("Loaded %d applicants."), applicants.count),
                            style: .success,
                            for: messageTarget
                        )
                    }
                    Telemetry.track("referrer_portal_loaded", properties: ["count": "\(applicants.count)"])
                    return
                } catch {
                    Telemetry.capture(error)
                    if let messageTarget {
                        setMessage(error.localizedDescription, style: .error, for: messageTarget)
                    }
                    return
                }
            }

            Telemetry.capture(error)
            if let messageTarget {
                setMessage(error.localizedDescription, style: .error, for: messageTarget)
            }
        }
    }
}

#Preview {
    ReferrerPortalView()
        .environmentObject(AppState())
        .environmentObject(NetworkMonitor())
}
