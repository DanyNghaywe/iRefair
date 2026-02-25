import SwiftUI

private enum ReferrerPortalSortColumn: Equatable {
    case candidate
    case position
    case status
}

private enum ReferrerPortalSortDirection: Equatable {
    case asc
    case desc

    mutating func toggle() {
        self = (self == .asc) ? .desc : .asc
    }
}

enum ReferrerPortalFeedbackAction: String, CaseIterable, Identifiable {
    case scheduleMeeting = "SCHEDULE_MEETING"
    case cancelMeeting = "CANCEL_MEETING"
    case reject = "REJECT"
    case cvMismatch = "CV_MISMATCH"
    case requestCvUpdate = "REQUEST_CV_UPDATE"
    case requestInfo = "REQUEST_INFO"
    case markInterviewed = "MARK_INTERVIEWED"
    case submitCvToHr = "SUBMIT_CV_TO_HR"
    case hrInterviews = "HR_INTERVIEWS"
    case hrDecidedNotToProceed = "HR_DECIDED_NOT_TO_PROCEED"
    case hrProvidedOffer = "HR_PROVIDED_OFFER"
    case applicantNoLongerInterested = "APPLICANT_NO_LONGER_INTERESTED"
    case applicantDecidedNotToMoveForward = "APPLICANT_DECIDED_NOT_TO_MOVE_FORWARD"
    case anotherApplicantBetterFit = "ANOTHER_APPLICANT_BETTER_FIT"
    case candidateAcceptedOffer = "CANDIDATE_ACCEPTED_OFFER"
    case candidateDidNotAcceptOffer = "CANDIDATE_DID_NOT_ACCEPT_OFFER"

    var id: String { rawValue }
}

private let referrerPortalActionOrder: [ReferrerPortalFeedbackAction] = [
    .scheduleMeeting,
    .cancelMeeting,
    .markInterviewed,
    .submitCvToHr,
    .hrInterviews,
    .hrProvidedOffer,
    .candidateAcceptedOffer,
    .candidateDidNotAcceptOffer,
    .requestCvUpdate,
    .requestInfo,
    .reject,
    .cvMismatch,
    .applicantNoLongerInterested,
    .hrDecidedNotToProceed,
    .applicantDecidedNotToMoveForward,
    .anotherApplicantBetterFit,
]

private let portalTerminalStatuses = Set([
    "not a good fit",
    "cv mismatch",
    "applicant no longer interested",
    "applicant decided not to move forward",
    "hr decided not to proceed",
    "another applicant was a better fit",
    "candidate did not accept offer",
    "landed job",
    "ineligible",
])

private let portalPreMeetingStatuses = Set([
    "new",
    "meeting requested",
    "meeting scheduled",
    "needs reschedule",
])

private let portalPostMeetingBaseStatuses = Set([
    "met with referrer",
    "cv updated",
    "info updated",
])

private let portalHRStatuses = Set([
    "submitted cv to hr",
    "interviews being conducted",
])

private let portalPostMeetingActionStatuses = portalPostMeetingBaseStatuses.union(portalHRStatuses)

private func normalizedPortalStatus(_ value: String?) -> String {
    (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
}

private func isPortalActionEnabled(_ action: ReferrerPortalFeedbackAction, status: String?) -> Bool {
    let normalized = normalizedPortalStatus(status).isEmpty ? "new" : normalizedPortalStatus(status)

    if portalTerminalStatuses.contains(normalized) { return false }

    if normalized == "job offered" {
        return action == .candidateAcceptedOffer || action == .candidateDidNotAcceptOffer
    }

    switch action {
    case .scheduleMeeting:
        return normalized == "new" || normalized == "meeting requested" || normalized == "needs reschedule"
    case .cancelMeeting:
        return normalized == "meeting scheduled"
    case .markInterviewed:
        return normalized == "meeting scheduled" || normalized == "meeting requested"
    case .requestInfo:
        return portalPreMeetingStatuses.contains(normalized)
    case .cvMismatch:
        return portalPreMeetingStatuses.contains(normalized)
    case .requestCvUpdate:
        return portalPreMeetingStatuses.contains(normalized) || portalPostMeetingActionStatuses.contains(normalized)
    case .reject:
        return portalPreMeetingStatuses.contains(normalized) || portalPostMeetingActionStatuses.contains(normalized)
    case .applicantNoLongerInterested:
        return portalPostMeetingActionStatuses.contains(normalized)
    case .submitCvToHr:
        return portalPostMeetingBaseStatuses.contains(normalized)
    case .hrInterviews:
        return normalized == "submitted cv to hr"
    case .hrProvidedOffer:
        return normalized == "submitted cv to hr" || normalized == "interviews being conducted"
    case .hrDecidedNotToProceed:
        return normalized == "submitted cv to hr" || normalized == "interviews being conducted"
    case .applicantDecidedNotToMoveForward:
        return portalHRStatuses.contains(normalized)
    case .anotherApplicantBetterFit:
        return normalized == "interviews being conducted"
    case .candidateAcceptedOffer, .candidateDidNotAcceptOffer:
        return normalized == "job offered"
    }
}

private struct ReferrerPortalActionSelection: Identifiable {
    let applicant: ReferrerApplicant
    let action: ReferrerPortalFeedbackAction

    var id: String { "\(applicant.id):\(action.rawValue)" }
}

struct ReferrerPortalView: View {
    private enum MessageTarget: Hashable {
        case sendLink
        case tokenSignIn
        case switchAccount
        case loadPortal
        case signOut
        case signOutAll
        case global
    }

    private struct InlineMessage {
        let text: String
        let style: StatusBanner.Style
    }

    private enum SessionRefreshResult {
        case success
        case requiresSignIn(message: String)
    }

    private let apiBaseURL: String = APIConfig.baseURL

    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var networkMonitor: NetworkMonitor
    @EnvironmentObject private var referrerPortalAccountStore: ReferrerPortalAccountStore

    @State private var accessToken = ""
    @State private var loginEmail = ""
    @State private var portalTokenInput = ""
    @State private var didBootstrapSession = false
    @State private var isRequestingLink = false
    @State private var isSigningOut = false
    @State private var isSigningOutAll = false

    @State private var referrer: ReferrerSummary?
    @State private var applicants: [ReferrerApplicant] = []
    @State private var portalCompanies: [ReferrerCompany] = []
    @State private var totalReferrals: Int?
    @State private var isLoading = false
    @State private var messages: [MessageTarget: InlineMessage] = [:]
    @State private var selectedCompanyId = "__all__"
    @State private var expandedApplicantRows = Set<String>()
    @State private var sortColumn: ReferrerPortalSortColumn = .candidate
    @State private var sortDirection: ReferrerPortalSortDirection = .asc
    @State private var currentPage = 1
    @State private var activePortalActionSelection: ReferrerPortalActionSelection?

    @State private var isAccountManagerPresented = false
    @State private var selectedApplicant: ReferrerApplicant?
    private let loadingRows = 1
    private let referrerMetaSingleColumnBreakpoint: CGFloat = 340
    private let allCompaniesFilterValue = "__all__"
    private let portalPageSize = 10
    private let portalMobileTableBreakpoint: CGFloat = 900
    private let portalDetailsSingleColumnBreakpoint: CGFloat = 600

    private var hasActiveAccount: Bool {
        referrerPortalAccountStore.activeAccount != nil
    }

    private var usesPortalMobileTableLayout: Bool {
        UIScreen.main.bounds.width <= portalMobileTableBreakpoint
    }

    private var activeAccount: ReferrerPortalAccount? {
        referrerPortalAccountStore.activeAccount
    }

    private var activeAccountLabel: String {
        activeAccount?.pickerLabel ?? l("No portal selected")
    }

    private var isBusySigningOut: Bool {
        isSigningOut || isSigningOutAll
    }

    private var hasAnySavedAccounts: Bool {
        !referrerPortalAccountStore.accounts.isEmpty
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

            if hasAnySavedAccounts {
                accountTopBarSection

                if let referrer {
                    referrerMeta(referrer)
                }

                if isLoading {
                    applicationsBlock {
                        portalLoadingApplicantsTable
                    }
                } else if !applicants.isEmpty {
                    applicationsBlock {
                        portalApplicationsTable
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
            } else {
                portalEmptyStateSection
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
        .onChange(of: appState.pendingReferrerPortalTokens.count) { count in
            guard count > 0 else { return }
            Task { await bootstrapSession() }
        }
        .onChange(of: selectedCompanyId) { _ in
            currentPage = 1
        }
        .onChange(of: applicants.count) { _ in
            if currentPage > totalPages {
                currentPage = max(1, totalPages)
            }
        }
        .sheet(isPresented: $isAccountManagerPresented) {
            portalAccountManagementSheet
        }
        .sheet(item: $activePortalActionSelection) { selection in
            ReferrerPortalActionSheet(
                selection: selection,
                token: accessToken,
                onCompleted: { _ in
                    Task { await loadPortal(messageTarget: nil, showSuccessMessage: false) }
                }
            )
        }
        .sheet(item: $selectedApplicant) { applicant in
            FeedbackSheet(applicant: applicant, token: accessToken) {
                Task { await loadPortal(messageTarget: nil) }
            }
        }
    }

    private var accountTopBarSection: some View {
        IRefairSection {
            HStack(alignment: .center, spacing: 10) {
                Menu {
                    ForEach(referrerPortalAccountStore.accounts) { account in
                        Button {
                            Task { await switchPortalAccount(to: account.normalizedIrref) }
                        } label: {
                            if account.normalizedIrref == activeAccount?.normalizedIrref {
                                Label(account.pickerLabel, systemImage: "checkmark")
                            } else {
                                Text(account.pickerLabel)
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 10) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(l("Portal account"))
                                .font(Theme.font(size: 11, weight: .bold))
                                .foregroundStyle(Color.white.opacity(0.78))
                                .textCase(.uppercase)
                                .kerning(2.0)
                            Text(activeAccountLabel)
                                .font(Theme.font(.subheadline, weight: .semibold))
                                .foregroundStyle(Color.white)
                                .lineLimit(1)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)

                        if referrerPortalAccountStore.accounts.count > 1 {
                            Image(systemName: "chevron.down")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Color.white.opacity(0.78))
                        }
                    }
                    .padding(.vertical, 10)
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color.white.opacity(0.08))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
                            )
                    )
                }
                .buttonStyle(.plain)
                .disabled(referrerPortalAccountStore.accounts.count < 2)

                Button {
                    isAccountManagerPresented = true
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color.white)
                        .frame(width: 44, height: 44)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(Color.white.opacity(0.12))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(Color.white.opacity(0.24), lineWidth: 1)
                                )
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(l("Manage portal accounts"))
            }

            if let message = messages[.switchAccount] {
                StatusBanner(text: message.text, style: message.style)
            }
        }
    }

    private var portalEmptyStateSection: some View {
        IRefairSection {
            IRefairTableEmptyState(
                title: l("Sign in to your portal"),
                description: l("Add your portal account to review applicants and manage referrals."),
                tone: .lightOnDark
            )
            Button(l("Add portal account")) {
                isAccountManagerPresented = true
            }
            .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: true))
            .disabled(isBusySigningOut)
        }
    }

    private var portalAccountManagementSheet: some View {
        NavigationStack {
            IRefairScreen {
                IRefairForm {
                    if hasAnySavedAccounts {
                        accountSwitcherSection
                    }
                    signInSection
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(l("Close")) { isAccountManagerPresented = false }
                    }
                }
            }
        }
    }

    private var accountSwitcherSection: some View {
        IRefairSection(l("Portal accounts")) {
            ForEach(referrerPortalAccountStore.accounts) { account in
                portalAccountRow(account)
                if account.id != referrerPortalAccountStore.accounts.last?.id {
                    Divider()
                        .background(Color.white.opacity(0.16))
                }
            }

            if let message = messages[.signOut] {
                StatusBanner(text: message.text, style: message.style)
            }

            if referrerPortalAccountStore.accounts.count > 1 {
                Button(l("Sign out all portals")) {
                    Task { await signOutAll() }
                }
                .buttonStyle(IRefairGhostButtonStyle(fillWidth: true))
                .disabled(isBusySigningOut)

                if let message = messages[.signOutAll] {
                    StatusBanner(text: message.text, style: message.style)
                }
            }
        }
    }

    private func portalAccountRow(_ account: ReferrerPortalAccount) -> some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .center, spacing: 8) {
                    if account.normalizedIrref == activeAccount?.normalizedIrref {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Theme.accentPrimary)
                    }

                    Text(account.pickerLabel)
                        .font(Theme.font(.subheadline, weight: .semibold))
                        .foregroundStyle(Color.white)
                        .lineLimit(2)
                }

                if !account.email.isEmpty {
                    Text(account.email)
                        .font(Theme.font(.caption))
                        .foregroundStyle(Color.white.opacity(0.78))
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Button(l("Sign out")) {
                Task { await signOutPortalAccount(irref: account.normalizedIrref) }
            }
            .buttonStyle(IRefairGhostButtonStyle())
            .disabled(isBusySigningOut)
        }
    }

    private var signInSection: some View {
        IRefairSection(hasActiveAccount ? l("Add another portal account") : l("Sign in to your portal")) {
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
                .disabled(isRequestingLink || !networkMonitor.isConnected || isBusySigningOut)
            }

            if let message = messages[.sendLink] {
                StatusBanner(text: message.text, style: message.style)
            }

            Text(l("We'll send another email with your \"Open portal\" link."))
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

            IRefairField(l("Paste portal link")) {
                IRefairTextField("", text: $portalTokenInput)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .accessibilityLabel(l("Paste portal link"))
            }
            HStack(spacing: 12) {
                Button(l("Sign in with link")) {
                    Task { await signInWithPortalToken() }
                }
                .buttonStyle(IRefairGhostButtonStyle(fillWidth: true))
                .disabled(isRequestingLink || !networkMonitor.isConnected || isBusySigningOut)
            }

            if let message = messages[.tokenSignIn] {
                StatusBanner(text: message.text, style: message.style)
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

            if usesPortalMobileTableLayout {
                VStack(alignment: .leading, spacing: 8) {
                    if portalCompanies.count > 1 {
                        portalCompanyFilterControl
                    }
                    HStack(alignment: .center, spacing: 8) {
                        portalTotalCountPill
                        if totalPages > 1 {
                            portalHeaderPageInfoPill
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                HStack(alignment: .center, spacing: 8) {
                    if portalCompanies.count > 1 {
                        portalCompanyFilterControl
                    }

                    portalTotalCountPill

                    if totalPages > 1 {
                        portalHeaderPageInfoPill
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var portalTotalCountPill: some View {
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

    private var portalHeaderPageInfoPill: some View {
        Text("Page \(validCurrentPage) / \(totalPages)")
            .font(Theme.font(size: 12, weight: .medium))
            .foregroundStyle(Color.white.opacity(0.85))
            .padding(.vertical, 7)
            .padding(.horizontal, 10)
            .background(
                Capsule(style: .continuous)
                    .fill(Color.white.opacity(0.12))
                    .overlay(
                        Capsule(style: .continuous)
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
            )
    }

    private var activeReferralsCount: Int {
        filteredApplicants.count
    }

    private var totalReferralsCount: Int {
        totalReferrals ?? applicants.count
    }

    private var filteredApplicants: [ReferrerApplicant] {
        guard selectedCompanyId != allCompaniesFilterValue else { return applicants }
        return applicants.filter { applicant in
            (applicant.companyId ?? "")
                .trimmingCharacters(in: .whitespacesAndNewlines) == selectedCompanyId
        }
    }

    private var sortedFilteredApplicants: [ReferrerApplicant] {
        filteredApplicants.sorted { lhs, rhs in
            let comparison: ComparisonResult
            switch sortColumn {
            case .candidate:
                let left = nonEmpty(lhs.applicantName) ?? lhs.displayName
                let right = nonEmpty(rhs.applicantName) ?? rhs.displayName
                comparison = left.localizedCaseInsensitiveCompare(right)
            case .position:
                let left = nonEmpty(lhs.position) ?? ""
                let right = nonEmpty(rhs.position) ?? ""
                comparison = left.localizedCaseInsensitiveCompare(right)
            case .status:
                let left = normalizedPortalStatus(lhs.status).isEmpty ? "new" : normalizedPortalStatus(lhs.status)
                let right = normalizedPortalStatus(rhs.status).isEmpty ? "new" : normalizedPortalStatus(rhs.status)
                comparison = left.localizedCaseInsensitiveCompare(right)
            }

            if comparison == .orderedSame {
                let fallbackLeft = lhs.id
                let fallbackRight = rhs.id
                let fallback = fallbackLeft.localizedCaseInsensitiveCompare(fallbackRight)
                return sortDirection == .asc ? fallback != .orderedDescending : fallback == .orderedDescending
            }
            return sortDirection == .asc ? comparison == .orderedAscending : comparison == .orderedDescending
        }
    }

    private var totalPages: Int {
        max(1, Int(ceil(Double(max(0, sortedFilteredApplicants.count)) / Double(portalPageSize))))
    }

    private var validCurrentPage: Int {
        min(max(1, currentPage), totalPages)
    }

    private var paginatedApplicants: [ReferrerApplicant] {
        let startIndex = (validCurrentPage - 1) * portalPageSize
        guard startIndex < sortedFilteredApplicants.count else { return [] }
        let endIndex = min(sortedFilteredApplicants.count, startIndex + portalPageSize)
        return Array(sortedFilteredApplicants[startIndex..<endIndex])
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

    private var portalCompanyFilterControl: some View {
        Menu {
            Button {
                selectedCompanyId = allCompaniesFilterValue
            } label: {
                if selectedCompanyId == allCompaniesFilterValue {
                    Label(l("All companies"), systemImage: "checkmark")
                } else {
                    Text(l("All companies"))
                }
            }

            ForEach(portalCompanies) { company in
                Button {
                    selectedCompanyId = company.id
                } label: {
                    if company.id == selectedCompanyId {
                        Label(company.name, systemImage: "checkmark")
                    } else {
                        Text(company.name)
                    }
                }
            }
        } label: {
            HStack(spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(l("Filter by company"))
                        .font(Theme.font(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0x475569))
                        .textCase(.uppercase)
                        .kerning(1.6)
                    Text(selectedCompanyFilterLabel)
                        .font(Theme.font(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Image(systemName: "chevron.down")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x4B5563))
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .frame(minHeight: 36)
            .frame(minWidth: 180, maxWidth: 320, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.white.opacity(0.7))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Color(hex: 0x0F172A).opacity(0.12), lineWidth: 1)
                    )
            )
            .shadow(color: Color(hex: 0x0F172A).opacity(0.06), radius: 6, x: 0, y: 2)
        }
        .buttonStyle(.plain)
        .fixedSize(horizontal: false, vertical: true)
    }

    private var selectedCompanyFilterLabel: String {
        guard selectedCompanyId != allCompaniesFilterValue else { return l("All companies") }
        return portalCompanies.first(where: { $0.id == selectedCompanyId })?.name ?? l("All companies")
    }

    private enum PortalTableColumn {
        static let candidate: CGFloat = 248
        static let position: CGFloat = 228
        static let cv: CGFloat = 148
        static let status: CGFloat = 188
        static let actions: CGFloat = 164
        static let minimumWidth: CGFloat = candidate + position + cv + status + actions
    }

    private var portalWebInkColor: Color { Color(hex: 0x0F172A) }
    private var portalWebSubtextColor: Color { Color(hex: 0x334155) }
    private var portalWebMutedColor: Color { Color(hex: 0x64748B) }
    private var portalWebSlateColor: Color { Color(hex: 0x475569) }
    private var portalWebChevronActiveColor: Color { Color(hex: 0x1E40AF) }

    private var portalLoadingApplicantsTable: some View {
        applicationsTableShell {
            if usesPortalMobileTableLayout {
                loadingApplicantsRows
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                loadingApplicantsRows
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color.white.opacity(0.1))
                    )
            }
        }
    }

    private var portalApplicationsTable: some View {
        VStack(alignment: .leading, spacing: 12) {
            applicationsTableShell {
                if usesPortalMobileTableLayout {
                    portalApplicationsCardList
                } else {
                    ScrollView(.horizontal, showsIndicators: true) {
                        VStack(alignment: .leading, spacing: 0) {
                            portalApplicationsTableHeaderRow

                            if sortedFilteredApplicants.isEmpty {
                                portalApplicationsTableEmptyRow
                            } else {
                                ForEach(paginatedApplicants.indices, id: \.self) { index in
                                    let applicant = paginatedApplicants[index]
                                    let absoluteIndex = ((validCurrentPage - 1) * portalPageSize) + index
                                    portalApplicationsTableRow(applicant, rowIndex: absoluteIndex)
                                }
                            }
                        }
                        .frame(minWidth: PortalTableColumn.minimumWidth, alignment: .leading)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(Color.white.opacity(0.08))
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
            }

            if totalPages > 1 {
                portalPagination
            }
        }
    }

    @ViewBuilder
    private func applicationsTableShell<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        if usesPortalMobileTableLayout {
            content()
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            content()
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(6)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color.white.opacity(0.24))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(Color.white.opacity(0.22), lineWidth: 1)
                        )
                )
        }
    }

    private var portalApplicationsCardList: some View {
        VStack(alignment: .leading, spacing: 0) {
            if sortedFilteredApplicants.isEmpty {
                IRefairTableEmptyState(
                    title: l("No applications assigned"),
                    description: l("Candidate applications will appear here once they're assigned to you. Check back soon for new referrals to review."),
                    tone: .darkOnLight
                )
                .padding(.vertical, 20)
                .padding(.horizontal, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(4)
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(paginatedApplicants.indices, id: \.self) { index in
                        let applicant = paginatedApplicants[index]
                        let absoluteIndex = ((validCurrentPage - 1) * portalPageSize) + index
                        portalApplicationsCardRow(applicant, rowIndex: absoluteIndex)
                    }
                }
                .padding(4)
            }
        }
    }

    private var portalApplicationsTableHeaderRow: some View {
        HStack(spacing: 0) {
            portalSortableHeaderCell(l("Applicant"), width: PortalTableColumn.candidate, column: .candidate)
            portalSortableHeaderCell(l("Position / iRCRN"), width: PortalTableColumn.position, column: .position)
            portalTableHeaderCell(l("CV"), width: PortalTableColumn.cv)
            portalSortableHeaderCell(l("Status"), width: PortalTableColumn.status, column: .status)
            portalTableHeaderCell(l("Actions"), width: PortalTableColumn.actions)
        }
        .background(Color.white.opacity(0.18))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.14))
                .frame(height: 1)
        }
    }

    private var portalApplicationsTableEmptyRow: some View {
        HStack(spacing: 0) {
            IRefairTableEmptyState(
                title: l("No applications assigned"),
                description: l("Candidate applications will appear here once they're assigned to you. Check back soon for new referrals to review."),
                tone: .darkOnLight
            )
            .padding(.vertical, 18)
            .padding(.horizontal, 12)
            .frame(width: PortalTableColumn.minimumWidth, alignment: .leading)
        }
        .background(Color.clear)
    }

    private func portalApplicationsTableRow(_ applicant: ReferrerApplicant, rowIndex: Int) -> some View {
        let backgroundOpacity = rowIndex.isMultiple(of: 2) ? 0.06 : 0.16
        let isExpanded = expandedApplicantRows.contains(applicant.id)

        return VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 0) {
                portalTableBodyCell(width: PortalTableColumn.candidate) {
                    portalCandidateCellContent(applicant, isExpanded: isExpanded)
                }
                portalTableBodyCell(width: PortalTableColumn.position) {
                    portalPositionCellContent(applicant)
                }
                portalTableBodyCell(width: PortalTableColumn.cv) {
                    portalCVCellContent(applicant)
                }
                portalTableBodyCell(width: PortalTableColumn.status) {
                    portalStatusCellContent(applicant)
                }
                portalTableBodyCell(width: PortalTableColumn.actions) {
                    portalActionsCellContent(applicant)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture {
                toggleExpandedRow(applicant.id)
            }
            .background(Color.white.opacity(backgroundOpacity))

            if isExpanded {
                portalExpandedContentRow(applicant)
                    .background(Color.white.opacity(0.22))
            }
        }
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.white.opacity(0.08))
                .frame(height: 1)
        }
    }

    private func portalApplicationsCardRow(_ applicant: ReferrerApplicant, rowIndex: Int) -> some View {
        let isExpanded = expandedApplicantRows.contains(applicant.id)
        let baseOpacity = rowIndex.isMultiple(of: 2) ? 0.12 : 0.08

        return VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                portalCandidateCellContent(applicant, isExpanded: isExpanded)
                    .padding(.bottom, 12)
                    .overlay(alignment: .bottom) {
                        Rectangle()
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 1)
                    }
                    .padding(.bottom, 8)

                portalMobileLabeledCell(label: l("Position / iRCRN")) {
                    portalPositionCellContent(applicant)
                }

                portalMobileLabeledCell(label: l("CV")) {
                    portalCVCellContent(applicant)
                }

                portalMobileLabeledCell(label: l("Status")) {
                    portalStatusCellContent(applicant)
                }

                portalMobileLabeledCell(
                    label: l("Actions"),
                    hidesLabel: true,
                    addTopDivider: true,
                    topPadding: 20,
                    bottomPadding: 8
                ) {
                    portalActionsCellContent(applicant)
                }
            }
            .padding(16)
            .contentShape(Rectangle())
            .onTapGesture {
                toggleExpandedRow(applicant.id)
            }

            if isExpanded {
                portalExpandedContentCardSection(applicant)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(baseOpacity + 0.04),
                            Color.white.opacity(baseOpacity)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.white.opacity(0.15), lineWidth: 1)
                )
        )
        .shadow(color: Color.black.opacity(0.12), radius: 8, x: 0, y: 3)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func portalMobileLabeledCell<Content: View>(
        label: String,
        hidesLabel: Bool = false,
        addTopDivider: Bool = false,
        topPadding: CGFloat = 8,
        bottomPadding: CGFloat = 8,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            if !hidesLabel {
                Text(label)
                    .font(Theme.font(size: 10, weight: .bold))
                    .foregroundStyle(portalWebInkColor)
                    .textCase(.uppercase)
                    .kerning(1.6)
            }

            content()
        }
        .padding(.top, topPadding)
        .padding(.bottom, bottomPadding)
        .overlay(alignment: .top) {
            if addTopDivider {
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 1)
            }
        }
    }

    private func portalTableHeaderCell(_ title: String, width: CGFloat) -> some View {
        Text(title)
            .font(Theme.font(size: 12, weight: .bold))
            .foregroundStyle(Color(hex: 0x1E293B))
            .textCase(.uppercase)
            .kerning(1.9)
            .frame(width: width, alignment: .leading)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
    }

    private func portalSortableHeaderCell(
        _ title: String,
        width: CGFloat,
        column: ReferrerPortalSortColumn
    ) -> some View {
        Button {
            toggleSort(column)
        } label: {
            HStack(spacing: 6) {
                Text(title)
                    .font(Theme.font(size: 12, weight: .bold))
                    .foregroundStyle(Color(hex: 0x1E293B))
                    .textCase(.uppercase)
                    .kerning(1.9)
                Image(systemName: "arrow.up")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color(hex: 0x1E293B).opacity(sortColumn == column ? 1 : 0.45))
                    .rotationEffect(.degrees(sortColumn == column && sortDirection == .desc ? 180 : 0))
                    .animation(.easeInOut(duration: 0.15), value: sortDirection == .desc)
            }
            .frame(width: width, alignment: .leading)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
        }
        .buttonStyle(.plain)
    }

    private func portalTableBodyCell<Content: View>(width: CGFloat, @ViewBuilder content: () -> Content) -> some View {
        content()
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(width: width, alignment: .leading)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
    }

    private func portalCandidateCellContent(_ applicant: ReferrerApplicant, isExpanded: Bool) -> some View {
        HStack(alignment: .top, spacing: usesPortalMobileTableLayout ? 12 : 8) {
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(isExpanded ? portalWebChevronActiveColor : portalWebInkColor)
                .padding(.top, usesPortalMobileTableLayout ? 4 : 2)
                .rotationEffect(.degrees(isExpanded ? 90 : 0))
                .animation(.easeInOut(duration: 0.15), value: isExpanded)

            VStack(alignment: .leading, spacing: 2) {
                Text(applicant.displayName)
                    .font(Theme.font(size: 14, weight: .semibold))
                    .foregroundStyle(portalWebInkColor)
                    .fixedSize(horizontal: false, vertical: true)

                if let email = applicant.email?.trimmingCharacters(in: .whitespacesAndNewlines), !email.isEmpty {
                    Text(email)
                        .font(Theme.font(size: 12))
                        .foregroundStyle(portalWebSubtextColor)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let phone = applicant.phone?.trimmingCharacters(in: .whitespacesAndNewlines), !phone.isEmpty {
                    Text(phone)
                        .font(Theme.font(size: 12))
                        .foregroundStyle(portalWebSubtextColor)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func portalPositionCellContent(_ applicant: ReferrerApplicant) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(nonEmpty(applicant.position) ?? "—")
                .font(Theme.font(size: 14, weight: .semibold))
                .foregroundStyle(portalWebInkColor)
                .fixedSize(horizontal: false, vertical: true)

            Text("\(l("iRCRN")): \(nonEmpty(applicant.iCrn) ?? "-")")
                .font(Theme.font(size: 12))
                .foregroundStyle(portalWebSubtextColor)
                .fixedSize(horizontal: false, vertical: true)

            if portalCompanies.count > 1, let companyName = nonEmpty(applicant.companyName) {
                Text(companyName)
                    .font(Theme.font(size: 12))
                    .foregroundStyle(Theme.accentPrimary)
                    .italic()
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func portalCVCellContent(_ applicant: ReferrerApplicant) -> some View {
        Group {
            if let url = resumeDownloadURL(for: applicant) {
                Link(destination: url) {
                    Text(l("Download CV"))
                        .font(Theme.font(size: 12, weight: .semibold))
                        .foregroundStyle(portalWebInkColor)
                        .underline()
                }
                .buttonStyle(.plain)
            } else {
                Text(l("No CV available"))
                    .font(Theme.font(size: 12))
                    .foregroundStyle(portalWebMutedColor)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func portalStatusCellContent(_ applicant: ReferrerApplicant) -> some View {
        let normalized = normalizedPortalStatus(applicant.status)
        let hasMeeting = normalized == "meeting scheduled" && nonEmpty(applicant.meetingDate) != nil && nonEmpty(applicant.meetingTime) != nil
        let needsReschedule = normalized == "needs reschedule"

        return VStack(alignment: .leading, spacing: usesPortalMobileTableLayout ? 8 : 6) {
            portalStatusBadge(applicant.status)

            if hasMeeting {
                if let meetingText = formattedMeetingDisplay(date: applicant.meetingDate, time: applicant.meetingTime, timezone: applicant.meetingTimezone) {
                    Text("📅 \(meetingText)")
                        .font(Theme.font(size: 12, weight: .medium))
                        .foregroundStyle(Color(hex: 0x1E293B))
                        .fixedSize(horizontal: false, vertical: true)
                }
                if let meetingUrl = nonEmpty(applicant.meetingUrl), let url = URL(string: meetingUrl) {
                    Link(destination: url) {
                        Text("🔗 \(l("Join"))")
                            .font(Theme.font(size: 12, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x1D4ED8))
                            .underline()
                    }
                    .buttonStyle(.plain)
                }
            }

            if needsReschedule {
                Text("⚠ \(l("Needs reschedule"))")
                    .font(Theme.font(size: 11, weight: .medium))
                    .foregroundStyle(Color(hex: 0x78350F))
                    .padding(.vertical, 3)
                    .padding(.horizontal, 8)
                    .background(
                        Capsule(style: .continuous)
                            .fill(Color(hex: 0xF59E0B).opacity(0.12))
                    )
            }
        }
    }

    private func portalActionsCellContent(_ applicant: ReferrerApplicant) -> some View {
        let availableActions = referrerPortalActionOrder.filter { isPortalActionEnabled($0, status: applicant.status) }

        return Group {
            if availableActions.isEmpty {
                Text("—")
                    .font(Theme.font(size: 13))
                    .foregroundStyle(portalWebMutedColor)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Menu {
                    ForEach(availableActions) { action in
                        Button(portalActionLabel(action)) {
                            activePortalActionSelection = ReferrerPortalActionSelection(applicant: applicant, action: action)
                        }
                    }
                } label: {
                    HStack(spacing: 8) {
                        Text(l("Actions"))
                            .font(Theme.font(size: 13, weight: .medium))
                            .foregroundStyle(portalWebInkColor)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x4B5563))
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity, minHeight: 40, alignment: .leading)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(Color.white.opacity(0.32))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .stroke(Color.white.opacity(0.28), lineWidth: 1)
                            )
                    )
                }
                .menuIndicator(.hidden)
                .buttonStyle(.plain)
            }
        }
    }

    private var portalPagination: some View {
        HStack(spacing: 8) {
            portalPaginationButton("«", disabled: validCurrentPage == 1) {
                currentPage = 1
            }
            portalPaginationButton("‹", disabled: validCurrentPage == 1) {
                currentPage = max(1, validCurrentPage - 1)
            }

            Text("Page \(validCurrentPage) of \(totalPages)")
                .font(Theme.font(size: 12, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.9))
                .padding(.horizontal, 8)

            portalPaginationButton("›", disabled: validCurrentPage == totalPages) {
                currentPage = min(totalPages, validCurrentPage + 1)
            }
            portalPaginationButton("»", disabled: validCurrentPage == totalPages) {
                currentPage = totalPages
            }
        }
        .frame(maxWidth: .infinity, alignment: usesPortalMobileTableLayout ? .center : .trailing)
    }

    private func portalPaginationButton(_ title: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(Theme.font(size: 13, weight: .semibold))
                .foregroundStyle(disabled ? Color.white.opacity(0.45) : Color.white)
                .frame(width: 34, height: 34)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.white.opacity(disabled ? 0.06 : 0.12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(Color.white.opacity(0.18), lineWidth: 1)
                        )
                )
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }

    private func portalExpandedContentRow(_ applicant: ReferrerApplicant) -> some View {
        portalExpandedContentBlock(applicant, mobileStyle: false)
            .frame(width: PortalTableColumn.minimumWidth, alignment: .leading)
    }

    private func portalExpandedContentCardSection(_ applicant: ReferrerApplicant) -> some View {
        portalExpandedContentBlock(applicant, mobileStyle: true)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func portalExpandedContentBlock(_ applicant: ReferrerApplicant, mobileStyle: Bool) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            portalExpandedDetailsGrid(applicant)

            if let history = visibleActionHistory(for: applicant), !history.isEmpty {
                portalActionHistorySection(history)
            }
        }
        .padding(.horizontal, mobileStyle ? 16 : 14)
        .padding(.vertical, mobileStyle ? 14 : 12)
        .background {
            if mobileStyle {
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.08),
                        Color.white.opacity(0.04)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        }
        .overlay(alignment: .top) {
            if mobileStyle {
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 1)
            }
        }
    }

    private func portalExpandedDetailsGrid(_ applicant: ReferrerApplicant) -> some View {
        let screenWidth = UIScreen.main.bounds.width
        let detailColumns: [GridItem]
        if screenWidth <= portalDetailsSingleColumnBreakpoint {
            detailColumns = [GridItem(.flexible(minimum: 0), spacing: 10)]
        } else if usesPortalMobileTableLayout {
            detailColumns = [
                GridItem(.flexible(minimum: 140), spacing: 10),
                GridItem(.flexible(minimum: 140), spacing: 10),
            ]
        } else {
            detailColumns = [
                GridItem(.flexible(minimum: 140), spacing: 10),
                GridItem(.flexible(minimum: 140), spacing: 10),
                GridItem(.flexible(minimum: 140), spacing: 10),
            ]
        }

        return LazyVGrid(columns: detailColumns, alignment: .leading, spacing: 10) {
            portalDetailItem(l("Country of origin"), value: nonEmpty(applicant.countryOfOrigin) ?? l("Not provided"))
            portalDetailItem(l("Languages"), value: formatLanguages(applicant))
            portalDetailItem(l("Industry"), value: formatIndustry(applicant))
            portalDetailItem(l("Location"), value: formatLocation(applicant))
            portalDetailItem(workAuthorizationLabel(for: applicant), value: formatWorkAuthorization(applicant))
            portalDetailItem(l("Employment status"), value: formatEmploymentStatus(applicant))
        }
    }

    private func portalDetailItem(_ label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(Theme.font(size: 11, weight: .bold))
                .foregroundStyle(portalWebSlateColor)
                .textCase(.uppercase)
                .kerning(1.4)
            Text(value)
                .font(Theme.font(size: 13, weight: .medium))
                .foregroundStyle(portalWebInkColor)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.white.opacity(0.28))
        )
    }

    private func portalActionHistorySection(_ history: [ReferrerApplicantActionHistoryEntry]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(l("Activity history"))
                .font(Theme.font(size: 14, weight: .bold))
                .foregroundStyle(portalWebSlateColor)

            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(history.enumerated()), id: \.offset) { _, entry in
                    HStack(alignment: .top, spacing: 10) {
                        Circle()
                            .fill(Color(hex: 0x3D8BFD).opacity(0.75))
                            .frame(width: 8, height: 8)
                            .padding(.top, 6)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(portalHistoryActionLabel(entry.action))
                                .font(Theme.font(size: 13, weight: .semibold))
                                .foregroundStyle(Color(hex: 0x1E293B))

                            Text(portalHistoryMetaText(entry))
                                .font(Theme.font(size: 12))
                                .foregroundStyle(portalWebSubtextColor)
                                .fixedSize(horizontal: false, vertical: true)

                            if let notes = nonEmpty(entry.notes) {
                                Text("\"\(notes)\"")
                                    .font(Theme.font(size: 12))
                                    .foregroundStyle(portalWebSubtextColor)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }

    private func toggleSort(_ column: ReferrerPortalSortColumn) {
        if sortColumn == column {
            sortDirection.toggle()
        } else {
            sortColumn = column
            sortDirection = .asc
        }
    }

    private func toggleExpandedRow(_ applicantId: String) {
        if expandedApplicantRows.contains(applicantId) {
            expandedApplicantRows.remove(applicantId)
        } else {
            expandedApplicantRows.insert(applicantId)
        }
    }

    private func formattedMeetingDisplay(date: String?, time: String?, timezone: String?) -> String? {
        guard let date = nonEmpty(date), let time = nonEmpty(time) else { return nil }
        if let timezone = nonEmpty(timezone) {
            let tzLabel = timezone
                .split(separator: "/")
                .last
                .map { String($0).replacingOccurrences(of: "_", with: " ") } ?? timezone
            return "\(date) at \(time) (\(tzLabel) time)"
        }
        return "\(date) at \(time)"
    }

    private func formatLanguages(_ applicant: ReferrerApplicant) -> String {
        let langs = nonEmpty(applicant.languages) ?? ""
        let other = nonEmpty(applicant.languagesOther) ?? ""
        if langs.isEmpty && other.isEmpty { return l("Not provided") }
        if langs.isEmpty { return other }
        if other.isEmpty { return langs }
        return "\(langs), \(other)"
    }

    private func formatIndustry(_ applicant: ReferrerApplicant) -> String {
        let industry = nonEmpty(applicant.industryType) ?? ""
        let other = nonEmpty(applicant.industryOther) ?? ""
        if industry.isEmpty { return l("Not provided") }
        if industry.lowercased() == "other", !other.isEmpty { return other }
        return industry
    }

    private func formatLocation(_ applicant: ReferrerApplicant) -> String {
        let located = normalizedPortalStatus(applicant.locatedCanada)
        if located == "yes" {
            if let province = nonEmpty(applicant.province) {
                return "\(l("In Canada")) (\(province))"
            }
            return l("In Canada")
        }
        if located == "no" {
            return l("Outside Canada")
        }
        return l("Not provided")
    }

    private func workAuthorizationLabel(for applicant: ReferrerApplicant) -> String {
        normalizedPortalStatus(applicant.locatedCanada) == "yes" ? l("Work authorization") : l("Eligible to move")
    }

    private func formatWorkAuthorization(_ applicant: ReferrerApplicant) -> String {
        let source = normalizedPortalStatus(applicant.locatedCanada) == "yes"
            ? nonEmpty(applicant.authorizedCanada)
            : nonEmpty(applicant.eligibleMoveCanada)
        let value = (source ?? "").lowercased()
        if value == "yes" { return l("Yes") }
        if value == "no" { return l("No") }
        return source ?? l("Not provided")
    }

    private func formatEmploymentStatus(_ applicant: ReferrerApplicant) -> String {
        let value = normalizedPortalStatus(applicant.employmentStatus)
        switch value {
        case "yes":
            return l("Employed")
        case "no":
            return l("Not employed")
        case "temp", "temporary":
            return l("Temporary work")
        default:
            return nonEmpty(applicant.employmentStatus) ?? l("Not provided")
        }
    }

    private func visibleActionHistory(for applicant: ReferrerApplicant) -> [ReferrerApplicantActionHistoryEntry]? {
        let filtered = (applicant.actionHistory ?? [])
            .filter { $0.action.uppercased() != "OFFER_JOB" }
        if filtered.isEmpty { return nil }
        return Array(filtered.reversed())
    }

    private func portalHistoryActionLabel(_ action: String) -> String {
        if let known = ReferrerPortalFeedbackAction(rawValue: action.uppercased()) {
            return portalActionLabel(known)
        }

        switch action.uppercased() {
        case "RESCHEDULE_REQUESTED":
            return "Reschedule Requested"
        default:
            return action.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    private func portalHistoryMetaText(_ entry: ReferrerApplicantActionHistoryEntry) -> String {
        var parts: [String] = []
        parts.append(formattedHistoryTimestamp(entry.timestamp))

        if entry.performedBy == "applicant" {
            parts.append("by applicant")
        } else if let email = nonEmpty(entry.performedByEmail) {
            parts.append("by \(email)")
        } else if let performer = nonEmpty(entry.performedBy) {
            parts.append("by \(performer)")
        }

        return parts.joined(separator: " • ")
    }

    private func formattedHistoryTimestamp(_ timestamp: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: timestamp)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: timestamp)
        }
        guard let date else { return timestamp }
        let output = DateFormatter()
        output.locale = .current
        output.dateStyle = .medium
        output.timeStyle = .short
        return output.string(from: date)
    }

    private func portalActionLabel(_ action: ReferrerPortalFeedbackAction) -> String {
        switch action {
        case .scheduleMeeting: return "Schedule Meeting"
        case .cancelMeeting: return "Cancel Meeting"
        case .reject: return "Not a Good Fit"
        case .cvMismatch: return "CV Doesn't Match"
        case .requestCvUpdate: return "Request CV Update"
        case .requestInfo: return "Missing Information"
        case .markInterviewed: return "Mark Met with Referrer"
        case .submitCvToHr: return "Submitted CV to HR"
        case .hrInterviews: return "Interviews being conducted"
        case .hrDecidedNotToProceed: return "HR decided not to proceed"
        case .hrProvidedOffer: return "HR provided offer"
        case .applicantNoLongerInterested: return "Applicant no longer interested"
        case .applicantDecidedNotToMoveForward: return "Applicant decided not to move forward"
        case .anotherApplicantBetterFit: return "Another applicant was a better fit"
        case .candidateAcceptedOffer: return "Candidate accepted offer"
        case .candidateDidNotAcceptOffer: return "Candidate did not accept offer"
        }
    }

    private enum PortalStatusTone {
        case info
        case success
        case warning
        case error
        case neutral
    }

    private func portalStatusBadge(_ rawStatus: String?) -> some View {
        let label = portalStatusLabel(rawStatus)
        let tone = portalStatusTone(rawStatus)
        let style = portalStatusColors(for: tone)

        return Text(label)
            .font(Theme.font(size: 12, weight: .semibold))
            .foregroundStyle(style.fg)
            .padding(.vertical, 4)
            .padding(.horizontal, 10)
            .background(
                Capsule(style: .continuous)
                    .fill(style.bg)
            )
    }

    private func portalStatusLabel(_ rawStatus: String?) -> String {
        let normalized = (rawStatus ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()

        switch normalized {
        case "", "new":
            return "New"
        case "meeting requested":
            return "Meeting Requested"
        case "meeting scheduled":
            return "Meeting Scheduled"
        case "needs reschedule":
            return "Needs Reschedule"
        case "met with referrer", "interviewed":
            return "Met with Referrer"
        case "submitted cv to hr":
            return "Submitted CV to HR"
        case "interviews being conducted":
            return "Interviews Being Conducted"
        case "job offered":
            return "Job Offered"
        case "landed job":
            return "Landed Job"
        case "not a good fit":
            return "Not a Good Fit"
        case "applicant no longer interested":
            return "Applicant No Longer Interested"
        case "applicant decided not to move forward":
            return "Applicant Decided Not to Move Forward"
        case "hr decided not to proceed":
            return "HR Decided Not To Proceed"
        case "another applicant was a better fit":
            return "Another Applicant Was A Better Fit"
        case "candidate did not accept offer":
            return "Candidate Did Not Accept Offer"
        case "cv mismatch":
            return "CV Mismatch"
        case "cv update requested":
            return "CV Update Requested"
        case "cv updated":
            return "CV Updated"
        case "info requested":
            return "Info Requested"
        case "info updated":
            return "Info Updated"
        case "ineligible":
            return "Ineligible"
        default:
            return normalized.isEmpty ? "New" : normalized.capitalized
        }
    }

    private func portalStatusTone(_ rawStatus: String?) -> PortalStatusTone {
        let normalized = (rawStatus ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()

        switch normalized {
        case "", "new", "meeting requested", "submitted cv to hr", "interviews being conducted", "cv updated", "info updated":
            return .info
        case "meeting scheduled", "met with referrer", "interviewed", "job offered", "landed job":
            return .success
        case "needs reschedule", "cv update requested", "info requested":
            return .warning
        case "not a good fit", "applicant no longer interested", "applicant decided not to move forward",
             "hr decided not to proceed", "another applicant was a better fit", "candidate did not accept offer",
             "cv mismatch", "ineligible":
            return .error
        default:
            return .neutral
        }
    }

    private func portalStatusColors(for tone: PortalStatusTone) -> (bg: Color, fg: Color) {
        switch tone {
        case .info:
            return (Color(hex: 0xDBEAFE), Color(hex: 0x1E40AF))
        case .success:
            return (Color(hex: 0xD1FAE5), Color(hex: 0x065F46))
        case .warning:
            return (Color(hex: 0xFEF3C7), Color(hex: 0x92400E))
        case .error:
            return (Color(hex: 0xFEE2E2), Color(hex: 0x991B1B))
        case .neutral:
            return (Color(hex: 0xE2E8F0), Color(hex: 0x334155))
        }
    }

    private func nonEmpty(_ value: String?) -> String? {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? nil : trimmed
    }

    private func resumeDownloadURL(for applicant: ReferrerApplicant) -> URL? {
        guard let rawPath = nonEmpty(applicant.resumeDownloadUrl) else { return nil }
        guard let baseURL = URL(string: apiBaseURL) else { return nil }
        guard var components = URLComponents(url: URL(string: rawPath, relativeTo: baseURL) ?? baseURL, resolvingAgainstBaseURL: true) else {
            return nil
        }
        if components.path.isEmpty || components.path == "/" {
            return nil
        }
        if let token = nonEmpty(accessToken) {
            var queryItems = components.queryItems ?? []
            queryItems.removeAll(where: { $0.name.lowercased() == "token" })
            queryItems.append(URLQueryItem(name: "token", value: token))
            components.queryItems = queryItems
        }
        return components.url
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

    private func referrerPortalAccountStatusMessage(for error: Error) -> String? {
        let rawMessage: String
        if let apiError = error as? APIError {
            rawMessage = apiError.message
        } else {
            rawMessage = error.localizedDescription
        }

        let normalized = rawMessage.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if normalized == "referrer not found" || normalized == "referrer not found." {
            return l("This portal account was permanently deleted. Please request a new sign-in link.")
        }
        if normalized.contains("archived") && normalized.contains("portal access") {
            return l("This portal account is archived. If it is restored, request a new sign-in link.")
        }
        return nil
    }

    private func referrerPortalDisplayErrorMessage(for error: Error) -> String {
        referrerPortalAccountStatusMessage(for: error) ?? error.localizedDescription
    }

    private func referrerPortalRefreshFailureMessage(for error: Error?) -> String {
        guard let error else {
            return l("Session expired. Please sign in again.")
        }

        let displayMessage = referrerPortalDisplayErrorMessage(for: error)
        let normalized = displayMessage
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()

        if normalized.isEmpty {
            return l("Session expired. Please sign in again.")
        }

        if normalized == "invalid or expired session" || normalized == "invalid or expired session." {
            return l("Session expired. Please sign in again.")
        }

        return displayMessage
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
        portalCompanies = []
        totalReferrals = nil
        selectedCompanyId = allCompaniesFilterValue
        expandedApplicantRows = []
        currentPage = 1
        activePortalActionSelection = nil
        selectedApplicant = nil
    }

    @MainActor
    private func switchPortalAccount(to irref: String) async {
        clearMessage(for: .switchAccount)

        let normalized = irref.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalized.isEmpty else { return }
        guard activeAccount?.normalizedIrref != normalized else { return }

        referrerPortalAccountStore.setActive(irref: normalized)
        accessToken = ""
        clearPortalData()
        await loadPortal(messageTarget: .switchAccount)
    }

    @MainActor
    private func bootstrapSession() async {
        clearMessage(for: .global)
        clearMessage(for: .switchAccount)

        let startupMessageTarget: MessageTarget = hasAnySavedAccounts ? .switchAccount : .global

        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            setMessage(l("App configuration is missing API base URL."), style: .error, for: startupMessageTarget)
            return
        }

        var handledPendingPortalToken = false
        while let pendingPortalToken = appState.consumeNextPendingReferrerPortalToken() {
            handledPendingPortalToken = true
            await exchangeSession(portalToken: pendingPortalToken, messageTarget: .global)
        }

        guard networkMonitor.isConnected else { return }
        guard let activeAccount else { return }

        if handledPendingPortalToken && !accessToken.isEmpty {
            return
        }

        if accessToken.isEmpty {
            switch await refreshSession(for: activeAccount.normalizedIrref) {
            case .success:
                break
            case .requiresSignIn(let message):
                setMessage(message, style: .error, for: startupMessageTarget)
                return
            }
        }

        await loadPortal(messageTarget: startupMessageTarget, showSuccessMessage: false)
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
                    l("Request received. If your account is accepted, we'll email your portal link."),
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
            setMessage(l("Paste a portal link first."), style: .error, for: .tokenSignIn)
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
        clearMessage(for: .signOutAll)
        clearMessage(for: .switchAccount)

        // Show the same applicants table skeleton while we exchange the portal token.
        // This keeps deep-link sign-ins visually consistent with regular portal loads.
        isLoading = true
        defer { isLoading = false }

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

            guard let responseReferrer = response.referrer else {
                throw APIError(message: l("Unable to identify referrer account. Please request a fresh sign-in link."))
            }

            accessToken = newAccessToken
            referrerPortalAccountStore.upsertAccount(
                from: responseReferrer,
                refreshToken: newRefreshToken,
                makeActive: true
            )
            referrer = responseReferrer

            if let messageTarget {
                setMessage(l("Signed in. Loading portal data..."), style: .success, for: messageTarget)
            }
            await loadPortal(messageTarget: messageTarget)
        } catch {
            Telemetry.capture(error)
            if let messageTarget {
                setMessage(referrerPortalDisplayErrorMessage(for: error), style: .error, for: messageTarget)
            }
        }
    }

    @MainActor
    private func refreshSession(for irref: String) async -> SessionRefreshResult {
        let refreshToken = referrerPortalAccountStore.refreshToken(for: irref)
        guard !refreshToken.isEmpty else {
            return .requiresSignIn(message: referrerPortalRefreshFailureMessage(for: nil))
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
            _ = referrerPortalAccountStore.saveRefreshToken(newRefreshToken, for: irref)
            return .success
        } catch {
            Telemetry.capture(error)
            accessToken = ""
            clearPortalData()
            referrerPortalAccountStore.clearRefreshToken(for: irref)
            return .requiresSignIn(message: referrerPortalRefreshFailureMessage(for: error))
        }
    }

    @MainActor
    private func signOutPortalAccount(irref: String) async {
        clearMessage(for: .signOut)
        clearMessage(for: .signOutAll)
        clearMessage(for: .switchAccount)

        let normalizedIrref = irref.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalizedIrref.isEmpty else {
            setMessage(l("No portal account selected."), style: .error, for: .signOut)
            return
        }
        guard referrerPortalAccountStore.account(for: normalizedIrref) != nil else { return }

        isSigningOut = true
        defer { isSigningOut = false }

        let refreshToken = referrerPortalAccountStore.refreshToken(for: normalizedIrref)
        if !refreshToken.isEmpty {
            _ = try? await APIClient.logoutReferrerMobileSession(baseURL: apiBaseURL, refreshToken: refreshToken)
        }

        let wasActiveAccount = activeAccount?.normalizedIrref == normalizedIrref
        referrerPortalAccountStore.removeAccount(irref: normalizedIrref)

        if wasActiveAccount {
            accessToken = ""
            clearPortalData()
        }

        if referrerPortalAccountStore.accounts.isEmpty {
            setMessage(l("Signed out."), style: .success, for: .signOut)
        } else {
            setMessage(l("Signed out of this portal account."), style: .success, for: .signOut)
        }
    }

    @MainActor
    private func signOutAll() async {
        clearMessage(for: .signOutAll)
        clearMessage(for: .signOut)
        clearMessage(for: .switchAccount)

        isSigningOutAll = true
        defer { isSigningOutAll = false }

        let accounts = referrerPortalAccountStore.accounts
        for account in accounts {
            let refreshToken = referrerPortalAccountStore.refreshToken(for: account.normalizedIrref)
            if !refreshToken.isEmpty {
                _ = try? await APIClient.logoutReferrerMobileSession(baseURL: apiBaseURL, refreshToken: refreshToken)
            }
        }

        referrerPortalAccountStore.removeAllAccounts()
        accessToken = ""
        clearPortalData()
        setMessage(l("Signed out of all portal accounts."), style: .success, for: .signOutAll)
    }

    @MainActor
    private func loadPortal(messageTarget: MessageTarget? = .loadPortal, showSuccessMessage: Bool = true) async {
        if let messageTarget {
            clearMessage(for: messageTarget)
        }

        guard let activeAccount else { return }
        let activeIrref = activeAccount.normalizedIrref

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

        // Keep the existing applicants table skeleton visible for the full load path,
        // including silent session refresh before fetching portal data.
        isLoading = true
        defer { isLoading = false }

        if accessToken.isEmpty {
            switch await refreshSession(for: activeIrref) {
            case .success:
                break
            case .requiresSignIn(let message):
                if let messageTarget {
                    setMessage(message, style: .error, for: messageTarget)
                }
                return
            }
        }

        do {
            let response = try await APIClient.loadReferrerPortal(baseURL: apiBaseURL, token: accessToken)
            guard referrerPortalAccountStore.activeAccountIrref == activeIrref else { return }
            if let responseReferrer = response.referrer {
                referrer = responseReferrer
                referrerPortalAccountStore.upsertAccount(from: responseReferrer, makeActive: false)
            } else {
                referrer = nil
            }
            applicants = response.applicants ?? []
            expandedApplicantRows = expandedApplicantRows.intersection(Set(applicants.map(\.id)))
            portalCompanies = response.companies ?? []
            totalReferrals = response.total
            if selectedCompanyId != allCompaniesFilterValue,
               !portalCompanies.contains(where: { $0.id == selectedCompanyId }) {
                selectedCompanyId = allCompaniesFilterValue
            }
            if referrer == nil, applicants.isEmpty {
                if let messageTarget {
                    setMessage(l("Unable to load your details."), style: .error, for: messageTarget)
                }
                return
            }
            if let messageTarget, showSuccessMessage {
                setMessage(
                    String.localizedStringWithFormat(l("Loaded %d applicants."), applicants.count),
                    style: .success,
                    for: messageTarget
                )
            }
            Telemetry.track("referrer_portal_loaded", properties: ["count": "\(applicants.count)"])
        } catch {
            switch await refreshSession(for: activeIrref) {
            case .success:
                // The refresh succeeded; retry the load once.
                do {
                    let retryResponse = try await APIClient.loadReferrerPortal(baseURL: apiBaseURL, token: accessToken)
                    guard referrerPortalAccountStore.activeAccountIrref == activeIrref else { return }
                    if let retryReferrer = retryResponse.referrer {
                        referrer = retryReferrer
                        referrerPortalAccountStore.upsertAccount(from: retryReferrer, makeActive: false)
                    } else {
                        referrer = nil
                    }
                    applicants = retryResponse.applicants ?? []
                    expandedApplicantRows = expandedApplicantRows.intersection(Set(applicants.map(\.id)))
                    portalCompanies = retryResponse.companies ?? []
                    totalReferrals = retryResponse.total
                    if selectedCompanyId != allCompaniesFilterValue,
                       !portalCompanies.contains(where: { $0.id == selectedCompanyId }) {
                        selectedCompanyId = allCompaniesFilterValue
                    }
                    if referrer == nil, applicants.isEmpty {
                        if let messageTarget {
                            setMessage(l("Unable to load your details."), style: .error, for: messageTarget)
                        }
                        return
                    }
                    if let messageTarget, showSuccessMessage {
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
                        setMessage(referrerPortalDisplayErrorMessage(for: error), style: .error, for: messageTarget)
                    }
                    return
                }
            case .requiresSignIn(let message):
                Telemetry.capture(error)
                if let messageTarget {
                    setMessage(message, style: .error, for: messageTarget)
                }
                return
            }
        }
    }
}

private struct ReferrerPortalActionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var networkMonitor: NetworkMonitor

    private let apiBaseURL: String = APIConfig.baseURL

    let selection: ReferrerPortalActionSelection
    let token: String
    let onCompleted: (ReferrerFeedbackResponse) -> Void

    @State private var notes = ""
    @State private var meetingDateSelection = Date()
    @State private var meetingTimeSelection = Date()
    @State private var meetingTimezone = "America/Toronto"
    @State private var meetingUrl = ""
    @State private var includeUpdateLink = true
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    private static let timeZoneOptions = TimeZone.knownTimeZoneIdentifiers.sorted()

    var body: some View {
        NavigationStack {
            IRefairScreen {
                IRefairForm {
                    if !networkMonitor.isConnected {
                        IRefairSection {
                            StatusBanner(text: l("You're offline. Connect to the internet to send feedback."), style: .warning)
                        }
                    }

                    IRefairSection(l("Action")) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(actionTitle)
                                .font(Theme.font(.headline, weight: .semibold))
                                .foregroundStyle(Color.white)
                            Text(actionDescription)
                                .font(Theme.font(.caption))
                                .foregroundStyle(Color.white.opacity(0.82))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }

                    IRefairSection(l("Applicant")) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(selection.applicant.displayName)
                                .font(Theme.font(.headline, weight: .semibold))
                                .foregroundStyle(Color.white)
                            if let position = nonEmpty(selection.applicant.position) {
                                Text(position)
                                    .font(Theme.font(.subheadline))
                                    .foregroundStyle(Color.white.opacity(0.88))
                            }
                            if let email = nonEmpty(selection.applicant.email) {
                                Text(email)
                                    .font(Theme.font(.caption))
                                    .foregroundStyle(Color.white.opacity(0.78))
                            }
                        }
                    }

                    if selection.action == .scheduleMeeting {
                        IRefairSection(l("Meeting details")) {
                            IRefairField(l("Date")) {
                                DatePicker("", selection: $meetingDateSelection, displayedComponents: .date)
                                    .labelsHidden()
                                    .datePickerStyle(.compact)
                                    .tint(Theme.accentPrimary)
                                    .irefairInput()
                            }

                            IRefairField(l("Time")) {
                                DatePicker("", selection: $meetingTimeSelection, displayedComponents: .hourAndMinute)
                                    .labelsHidden()
                                    .datePickerStyle(.compact)
                                    .tint(Theme.accentPrimary)
                                    .irefairInput()
                            }

                            IRefairMenuPicker(
                                l("Timezone"),
                                displayValue: timezoneDisplay(meetingTimezone),
                                selection: $meetingTimezone
                            ) {
                                ForEach(Self.timeZoneOptions, id: \.self) { timezone in
                                    Text(timezoneDisplay(timezone)).tag(timezone)
                                }
                            }

                            IRefairField(l("Meeting URL")) {
                                IRefairTextField("https://zoom.us/j/...", text: $meetingUrl)
                                    .textInputAutocapitalization(.never)
                                    .keyboardType(.URL)
                                    .autocorrectionDisabled()
                            }
                        }
                    }

                    if selection.action == .cvMismatch {
                        IRefairSection {
                            Toggle(l("Include link for candidate to update their CV"), isOn: $includeUpdateLink)
                                .toggleStyle(IRefairCheckboxToggleStyle())
                        }
                    }

                    IRefairSection(l(notesLabel)) {
                        IRefairField(l(notesLabel)) {
                            IRefairTextField(notesPlaceholder, text: $notes, axis: .vertical)
                                .lineLimit(4, reservesSpace: true)
                        }
                    }

                    if let errorMessage {
                        IRefairSection {
                            StatusBanner(text: errorMessage, style: .error)
                        }
                    }

                    IRefairSection {
                        Button {
                            Task { await submit() }
                        } label: {
                            if isSubmitting {
                                ProgressView().tint(.white)
                            } else {
                                Text(l("Confirm"))
                            }
                        }
                        .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: true))
                        .disabled(isSubmitting || !networkMonitor.isConnected)

                        Button(l("Cancel")) {
                            dismiss()
                        }
                        .buttonStyle(IRefairGhostButtonStyle(fillWidth: true))
                        .disabled(isSubmitting)
                    }
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(l("Close")) { dismiss() }
                    }
                }
            }
        }
    }

    private var actionTitle: String {
        switch selection.action {
        case .scheduleMeeting: return "Schedule Meeting"
        case .cancelMeeting: return "Cancel Meeting"
        case .reject: return "Not a Good Fit"
        case .cvMismatch: return "CV Doesn't Match"
        case .requestCvUpdate: return "Request CV Update"
        case .requestInfo: return "Request Information"
        case .markInterviewed: return "Mark Met with Referrer"
        case .submitCvToHr: return "Submitted CV to HR"
        case .hrInterviews: return "Interviews being conducted"
        case .hrDecidedNotToProceed: return "HR decided not to proceed"
        case .hrProvidedOffer: return "HR provided offer"
        case .applicantNoLongerInterested: return "Applicant no longer interested"
        case .applicantDecidedNotToMoveForward: return "Applicant decided not to move forward"
        case .anotherApplicantBetterFit: return "Another applicant was a better fit"
        case .candidateAcceptedOffer: return "Candidate accepted offer"
        case .candidateDidNotAcceptOffer: return "Candidate did not accept offer"
        }
    }

    private var actionDescription: String {
        let isMeetingScheduled = normalizedPortalStatus(selection.applicant.status) == "meeting scheduled"
        switch selection.action {
        case .scheduleMeeting:
            return "Schedule a meeting with this candidate. They will receive an email with the details."
        case .cancelMeeting:
            return "Cancel the scheduled meeting. The candidate will be notified."
        case .reject:
            return "Mark this candidate as not a good fit. They will receive a polite rejection email."
        case .cvMismatch:
            return "The CV doesn't match your requirements. The candidate will receive feedback."
        case .requestCvUpdate:
            return isMeetingScheduled
                ? "A meeting is scheduled with this candidate. Requesting a CV update will cancel the meeting. You can reschedule after reviewing the updated CV."
                : "Request the candidate to update their CV. They will receive a link to make changes."
        case .requestInfo:
            return "Request additional information from the candidate."
        case .markInterviewed:
            return "Mark that this candidate met with the referrer. They will receive a confirmation."
        case .submitCvToHr:
            return "Confirm that the candidate CV has been submitted to HR. They will be notified."
        case .hrInterviews:
            return "Mark that HR interviews are currently being conducted."
        case .hrDecidedNotToProceed:
            return "HR has decided not to proceed with this candidate. They will be notified."
        case .hrProvidedOffer:
            return "HR has provided an offer. The candidate will be notified."
        case .applicantNoLongerInterested:
            return "Mark that the applicant is no longer interested. They will be notified."
        case .applicantDecidedNotToMoveForward:
            return "The applicant decided not to move forward. They will be notified."
        case .anotherApplicantBetterFit:
            return "Another applicant was a better fit. This candidate will be notified."
        case .candidateAcceptedOffer:
            return "Mark that the candidate accepted the offer. This will close the application."
        case .candidateDidNotAcceptOffer:
            return "Mark that the candidate did not accept the offer. A reason is required."
        }
    }

    private var notesLabel: String {
        selection.action == .candidateDidNotAcceptOffer ? "Reason" : "Notes"
    }

    private var notesPlaceholder: String {
        selection.action == .candidateDidNotAcceptOffer
            ? "Please provide a reason..."
            : "Add notes (optional)..."
    }

    private func timezoneDisplay(_ identifier: String) -> String {
        let suffix = identifier.split(separator: "/").last.map { String($0) } ?? identifier
        return identifier.replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: String(suffix), with: suffix.replacingOccurrences(of: "_", with: " "))
    }

    private func nonEmpty(_ value: String?) -> String? {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? nil : trimmed
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    private func formattedMeetingDate() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: meetingDateSelection)
    }

    private func formattedMeetingTime() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: meetingTimeSelection)
    }

    @MainActor
    private func submit() async {
        errorMessage = nil

        guard !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = l("Missing token.")
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

        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        if selection.action == .candidateDidNotAcceptOffer && trimmedNotes.isEmpty {
            errorMessage = "Please provide a reason for the offer being declined."
            return
        }

        if selection.action == .scheduleMeeting {
            let trimmedUrl = meetingUrl.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmedUrl.isEmpty else {
                errorMessage = "Meeting URL is required."
                return
            }
            guard let parsed = URL(string: trimmedUrl),
                  let scheme = parsed.scheme?.lowercased(),
                  scheme == "http" || scheme == "https" else {
                errorMessage = "Invalid meeting URL."
                return
            }
        }

        isSubmitting = true
        defer { isSubmitting = false }

        do {
            var payload: [String: Any] = [
                "applicationId": selection.applicant.id,
                "action": selection.action.rawValue,
            ]

            if !trimmedNotes.isEmpty {
                payload["notes"] = trimmedNotes
            }

            if selection.action == .scheduleMeeting {
                payload["meetingDate"] = formattedMeetingDate()
                payload["meetingTime"] = formattedMeetingTime()
                payload["meetingTimezone"] = meetingTimezone
                payload["meetingUrl"] = meetingUrl.trimmingCharacters(in: .whitespacesAndNewlines)
            }

            if selection.action == .cvMismatch {
                payload["includeUpdateLink"] = includeUpdateLink
            }

            let response = try await APIClient.submitReferrerPortalAction(
                baseURL: apiBaseURL,
                token: token,
                payload: payload
            )

            Telemetry.track("referrer_portal_action_submitted", properties: ["action": selection.action.rawValue])
            onCompleted(response)
            dismiss()
        } catch {
            Telemetry.capture(error)
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    ReferrerPortalView()
        .environmentObject(AppState())
        .environmentObject(NetworkMonitor())
        .environmentObject(ReferrerPortalAccountStore())
}
