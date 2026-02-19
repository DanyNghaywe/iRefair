import SwiftUI
import UniformTypeIdentifiers

struct ApplicantView: View {
    private let apiBaseURL: String = APIConfig.baseURL
    @AppStorage("applicantUpdateToken") private var storedUpdateToken: String = ""
    @AppStorage("applicantUpdateAppId") private var storedUpdateAppId: String = ""

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    @EnvironmentObject private var networkMonitor: NetworkMonitor

    @State private var firstName = ""
    @State private var middleName = ""
    @State private var familyName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var countryOfOrigin = ""
    @State private var languages: Set<String> = []
    @State private var languagesOther = ""
    @State private var locatedCanada = ""
    @State private var province = ""
    @State private var authorizedCanada = ""
    @State private var eligibleMoveCanada = ""
    @State private var industryType = ""
    @State private var industryOther = ""
    @State private var employmentStatus = ""
    @State private var linkedin = ""
    @State private var consent = false

    @State private var resumeFile: UploadFile?
    @State private var resumeName = ""
    @State private var showDocumentPicker = false

    @State private var updateToken = ""
    @State private var updateAppId = ""
    @State private var updatePurpose = ""
    @State private var isPrefillLoading = false
    @State private var applications: [ApplicantPortalApplication] = []
    @State private var applicationsPage = 1

    @State private var isSubmitting = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    @State private var fieldErrors: [String: String] = [:]
    @State private var validationScrollTarget: String?
    @State private var showSuccessModal = false
    @State private var successModalVariant: SubmissionSuccessVariant = .default
    @State private var submittedEmail = ""

    private let languageValues = ["English", "Arabic", "French", "Other"]
    private let applicationsPageSize = 10
    private let employmentValues = ["Yes", "No", "Temporary Work"]
    private let industryValues = [
        "Information Technology (IT)",
        "Finance / Banking / Accounting",
        "Healthcare / Medical",
        "Education / Academia",
        "Engineering / Construction",
        "Marketing / Advertising / PR",
        "Media / Entertainment / Journalism",
        "Legal / Law",
        "Human Resources / Recruitment",
        "Retail / E-commerce",
        "Hospitality / Travel / Tourism",
        "Logistics / Transportation",
        "Manufacturing",
        "Non-Profit / NGO",
        "Real Estate",
        "Energy / Utilities",
        "Telecommunications",
        "Agriculture / Food Industry",
        "Compliance/ Audit/ Monitoring & Evaluation",
        "Other",
    ]
    private let provinces = [
        "Alberta",
        "British Columbia",
        "Manitoba",
        "New Brunswick",
        "Newfoundland and Labrador",
        "Nova Scotia",
        "Ontario",
        "Prince Edward Island",
        "Quebec",
        "Saskatchewan",
        "Northwest Territories",
        "Nunavut",
        "Yukon",
    ]
    private let applicantConsentPoints = [
        "iRefair is a voluntary, community-driven initiative, and I am under no obligation to make any referrals.",
        "Any referral I make is based on my own discretion, and I am solely responsible for complying with my company’s internal referral or hiring policies.",
        "iRefair, &Beyond Consulting, IM Power SARL and inaspire and their legal founders assume no liability at all including but not limited to: hiring outcomes, internal processes, or employer decisions.",
        "My contact and employer details will be kept confidential and will not be shared without my consent.",
        "I may request to update or delete my information at any time by contacting us via email.",
        "My participation is entirely optional, and I can opt out at any time by contacting us via email.",
    ]

    private static let isoTimestampFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoTimestampFallbackFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private func parseTimestamp(_ value: String?) -> Date {
        let trimmed = (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return .distantPast
        }
        if let parsed = Self.isoTimestampFormatter.date(from: trimmed) {
            return parsed
        }
        if let parsed = Self.isoTimestampFallbackFormatter.date(from: trimmed) {
            return parsed
        }
        return .distantPast
    }

    private var sortedApplications: [ApplicantPortalApplication] {
        applications.sorted { lhs, rhs in
            let lhsDate = parseTimestamp(lhs.timestamp)
            let rhsDate = parseTimestamp(rhs.timestamp)
            return lhsDate > rhsDate
        }
    }

    private var applicationsTotalPages: Int {
        max(1, Int(ceil(Double(max(sortedApplications.count, 1)) / Double(applicationsPageSize))))
    }

    private var validApplicationsPage: Int {
        min(max(1, applicationsPage), applicationsTotalPages)
    }

    private var paginatedApplications: [ApplicantPortalApplication] {
        let start = (validApplicationsPage - 1) * applicationsPageSize
        guard start < sortedApplications.count else { return [] }
        let end = min(start + applicationsPageSize, sortedApplications.count)
        return Array(sortedApplications[start..<end])
    }

    var body: some View {
        NavigationStack {
            ScrollViewReader { scrollProxy in
                IRefairScreen {
                    IRefairForm {
                        IRefairCardHeader(
                            eyebrow: l("For applicants"),
                            title: l("Applicant referral request"),
                            lead: l("Tell us your background and target roles. We'll pair you with referrers when they're available.")
                        )

                        if !networkMonitor.isConnected {
                            IRefairSection {
                                StatusBanner(text: l("You're offline. Connect to the internet to submit the form."), style: .warning)
                            }
                        }

                        if !updateToken.isEmpty && !updateAppId.isEmpty {
                            applicantApplicationsBlock
                        }

                        IRefairSection(l("Personal information")) {
                            IRefairField(l("First name *")) {
                                IRefairTextField("", text: $firstName)
                                    .accessibilityLabel(l("First name *"))
                            }
                            .id(fieldAnchorId(for: "firstName"))
                            errorText("firstName")
                            IRefairField(l("Middle name")) {
                                IRefairTextField("", text: $middleName)
                                    .accessibilityLabel(l("Middle name"))
                            }
                            IRefairField(l("Last name *")) {
                                IRefairTextField("", text: $familyName)
                                    .accessibilityLabel(l("Last name *"))
                            }
                            .id(fieldAnchorId(for: "familyName"))
                            errorText("familyName")
                            IRefairField(l("Email *")) {
                                IRefairTextField("", text: $email)
                                    .keyboardType(.emailAddress)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .accessibilityLabel(l("Email *"))
                            }
                            .id(fieldAnchorId(for: "email"))
                            errorText("email")
                            IRefairField(l("Phone *")) {
                                IRefairTextField(l("+1-XXX-XXXX or +961-XX-XXXXXX"), text: $phone)
                                    .keyboardType(.phonePad)
                                    .accessibilityLabel(l("Phone *"))
                            }
                            .id(fieldAnchorId(for: "phone"))
                            errorText("phone")
                            IRefairMenuPicker(
                                l("Country of origin *"),
                                displayValue: countryOfOrigin.isEmpty ? l("Select") : countryOfOrigin,
                                isPlaceholder: countryOfOrigin.isEmpty,
                                selection: $countryOfOrigin
                            ) {
                                Text(l("Select")).tag("")
                                ForEach(CountryData.all, id: \.self) { country in
                                    Text(country).tag(country)
                                }
                            }
                            .id(fieldAnchorId(for: "countryOfOrigin"))
                            errorText("countryOfOrigin")
                        }

                        IRefairSection(l("Languages")) {
                            Group {
                                ForEach(languageOptions, id: \.value) { option in
                                    Toggle(option.label, isOn: Binding(
                                        get: { languages.contains(option.value) },
                                        set: { isSelected in
                                            if isSelected {
                                                languages.insert(option.value)
                                            } else {
                                                languages.remove(option.value)
                                            }
                                        }
                                    ))
                                    .toggleStyle(IRefairCheckboxToggleStyle())
                                }
                            }
                            .padding(.top, 1)
                            .id(fieldAnchorId(for: "languages"))
                            errorText("languages")
                            if languages.contains("Other") {
                                IRefairField(l("Other languages *")) {
                                    IRefairTextField(l("Please specify"), text: $languagesOther)
                                        .accessibilityLabel(l("Other languages *"))
                                }
                                .id(fieldAnchorId(for: "languagesOther"))
                                errorText("languagesOther")
                            }
                        }

                        IRefairSection(l("Location and authorization")) {
                            IRefairMenuPicker(
                                l("Located in Canada? *"),
                                displayValue: pickerDisplayValue(locatedCanada, options: yesNoOptions),
                                isPlaceholder: locatedCanada.isEmpty,
                                selection: $locatedCanada
                            ) {
                                Text(l("Select")).tag("")
                                ForEach(yesNoOptions, id: \.value) { option in
                                    Text(option.label).tag(option.value)
                                }
                            }
                            .id(fieldAnchorId(for: "locatedCanada"))
                            errorText("locatedCanada")

                            if locatedCanada == "Yes" {
                                IRefairMenuPicker(
                                    l("Province *"),
                                    displayValue: province.isEmpty ? l("Select province") : province,
                                    isPlaceholder: province.isEmpty,
                                    selection: $province
                                ) {
                                    Text(l("Select")).tag("")
                                    ForEach(provinces, id: \.self) { item in
                                        Text(item).tag(item)
                                    }
                                }
                                .id(fieldAnchorId(for: "province"))
                                errorText("province")

                                IRefairMenuPicker(
                                    l("Authorized to work in Canada? *"),
                                    displayValue: pickerDisplayValue(authorizedCanada, options: yesNoOptions),
                                    isPlaceholder: authorizedCanada.isEmpty,
                                    selection: $authorizedCanada
                                ) {
                                    Text(l("Select")).tag("")
                                    ForEach(yesNoOptions, id: \.value) { option in
                                        Text(option.label).tag(option.value)
                                    }
                                }
                                .id(fieldAnchorId(for: "authorizedCanada"))
                                errorText("authorizedCanada")
                            }

                            if locatedCanada == "No" {
                                IRefairMenuPicker(
                                    l("Eligible to move to Canada? *"),
                                    displayValue: pickerDisplayValue(eligibleMoveCanada, options: yesNoOptions),
                                    isPlaceholder: eligibleMoveCanada.isEmpty,
                                    selection: $eligibleMoveCanada
                                ) {
                                    Text(l("Select")).tag("")
                                    ForEach(yesNoOptions, id: \.value) { option in
                                        Text(option.label).tag(option.value)
                                    }
                                }
                                .id(fieldAnchorId(for: "eligibleMoveCanada"))
                                errorText("eligibleMoveCanada")
                            }
                        }

                        IRefairSection(l("Professional profile")) {
                            IRefairMenuPicker(
                                l("Industry *"),
                                displayValue: pickerDisplayValue(industryType, options: industryOptions),
                                isPlaceholder: industryType.isEmpty,
                                selection: $industryType
                            ) {
                                Text(l("Select")).tag("")
                                ForEach(industryOptions, id: \.value) { item in
                                    Text(item.label).tag(item.value)
                                }
                            }
                            .id(fieldAnchorId(for: "industryType"))
                            errorText("industryType")
                            if industryType == "Other" {
                                IRefairField(l("Industry details *")) {
                                    IRefairTextField(l("Please specify"), text: $industryOther)
                                        .accessibilityLabel(l("Industry details *"))
                                }
                                .id(fieldAnchorId(for: "industryOther"))
                                errorText("industryOther")
                            }
                            IRefairMenuPicker(
                                l("Currently employed? *"),
                                displayValue: pickerDisplayValue(employmentStatus, options: employmentOptions),
                                isPlaceholder: employmentStatus.isEmpty,
                                selection: $employmentStatus
                            ) {
                                Text(l("Select")).tag("")
                                ForEach(employmentOptions, id: \.value) { item in
                                    Text(item.label).tag(item.value)
                                }
                            }
                            .id(fieldAnchorId(for: "employmentStatus"))
                            errorText("employmentStatus")
                            IRefairField(l("LinkedIn profile")) {
                                IRefairTextField(l("https://linkedin.com/in/"), text: $linkedin)
                                    .keyboardType(.URL)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .accessibilityLabel(l("LinkedIn profile"))
                            }
                            .id(fieldAnchorId(for: "linkedin"))
                            errorText("linkedin")
                        }

                        IRefairSection(l("Attachments")) {
                            IRefairField(l("Upload your general CV / resume")) {
                                HStack {
                                    Button(l("Upload resume")) {
                                        showDocumentPicker = true
                                    }
                                    .buttonStyle(IRefairGhostButtonStyle())
                                    .fixedSize(horizontal: true, vertical: false)
                                    Text(resumeName.isEmpty ? l("No file selected yet") : resumeName)
                                        .font(Theme.font(size: 14))
                                        .foregroundStyle(Color.white.opacity(resumeName.isEmpty ? 0.92 : 1.0))
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .accessibilityLabel(l("Upload your general CV / resume"))
                            }
                            .id(fieldAnchorId(for: "resume"))
                            Text(l("Upload your main CV (not tailored to a specific job). You can submit a company-specific CV when applying to positions. Accepted: PDF, DOC, DOCX. Max 10MB."))
                                .font(Theme.font(size: 14))
                                .foregroundStyle(Color.white.opacity(0.9))
                                .lineSpacing(3)
                                .fixedSize(horizontal: false, vertical: true)
                            errorText("resume")
                        }

                        IRefairSection {
                            Text(l("Consent & Legal Disclaimer"))
                                .font(Theme.font(size: 18, weight: .bold))
                                .foregroundStyle(Theme.ink)
                                .fixedSize(horizontal: false, vertical: true)

                            Text(l("By submitting this form, I agree to be contacted by iRefair when a potential applicant may align with open roles at my company. I understand and acknowledge the following:"))
                                .font(Theme.font(size: 16))
                                .foregroundStyle(Theme.ink)
                                .lineSpacing(3)
                                .fixedSize(horizontal: false, vertical: true)

                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(Array(applicantConsentPoints.enumerated()), id: \.offset) { _, pointKey in
                                    consentPointRow(pointKey)
                                }
                            }

                            Toggle(l("I have read, understood, and agree to the above terms."), isOn: $consent)
                                .toggleStyle(
                                    IRefairCheckboxToggleStyle(
                                        labelColor: Color.white,
                                        labelFont: Theme.font(size: Theme.fieldLabelFontSize, weight: .semibold),
                                        labelKerning: Theme.fieldLabelKerning,
                                        verticalAlignment: .center,
                                        uncheckedFillColor: Color.white.opacity(0.9),
                                        uncheckedBorderColor: Color(hex: 0x4B5563).opacity(0.72)
                                    )
                                )
                                .id(fieldAnchorId(for: "consent"))
                            errorText("consent")
                        }
                        .padding(.top, -12)

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

                        actionButtons
                            .frame(maxWidth: .infinity, alignment: useLandscapeActionRow ? .trailing : .leading)
                            .padding(.top, 8)
                    }
                    .onChange(of: validationScrollTarget) { target in
                        guard let target else { return }
                        withAnimation(.easeInOut(duration: 0.25)) {
                            scrollProxy.scrollTo(target, anchor: .top)
                        }
                    }
                }
                .sheet(isPresented: $showDocumentPicker) {
                    DocumentPicker(allowedTypes: allowedTypes()) { url in
                        handlePickedFile(url)
                    }
                }
                .onAppear {
                    updateToken = storedUpdateToken
                    updateAppId = storedUpdateAppId
                    if !updateToken.isEmpty && !updateAppId.isEmpty {
                        Task { await loadPrefill() }
                    } else {
                        applications = []
                        applicationsPage = 1
                    }
                }
                .onChange(of: storedUpdateToken) { value in
                    updateToken = value
                    if !updateToken.isEmpty && !updateAppId.isEmpty {
                        Task { await loadPrefill() }
                    } else {
                        applications = []
                        applicationsPage = 1
                    }
                }
                .onChange(of: storedUpdateAppId) { value in
                    updateAppId = value
                    if !updateToken.isEmpty && !updateAppId.isEmpty {
                        Task { await loadPrefill() }
                    } else {
                        applications = []
                        applicationsPage = 1
                    }
                }
            }
        }
        .overlay {
            SubmissionSuccessPresentation(
                isPresented: $showSuccessModal,
                variant: successModalVariant,
                email: submittedEmail
            )
        }
    }

    private func errorText(_ key: String) -> some View {
        Group {
            if let message = fieldErrors[key] {
                Text(message)
                    .foregroundStyle(Theme.warning.opacity(0.95))
                    .font(Theme.font(.caption))
            }
        }
    }

    @ViewBuilder
    private var actionButtons: some View {
        if useLandscapeActionRow {
            HStack(spacing: 12) {
                Spacer(minLength: 0)
                clearActionButton(fillWidth: false)
                submitActionButton(fillWidth: false)
            }
        } else {
            VStack(spacing: 12) {
                clearActionButton(fillWidth: true)
                submitActionButton(fillWidth: true)
            }
        }
    }

    private var applicantApplicationsBlock: some View {
        VStack(alignment: .leading, spacing: 12) {
            applicantApplicationsHeader
            IRefairSection {
                if isPrefillLoading {
                    loadingApplicantApplicationsRows
                } else if sortedApplications.isEmpty {
                    IRefairTableEmptyState(
                        title: l("No applications yet"),
                        description: l("Your submitted applications will appear here once they are available."),
                        tone: .darkOnLight
                    )
                } else {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(paginatedApplications) { application in
                            applicantApplicationRow(application)
                        }
                    }
                    if applicationsTotalPages > 1 {
                        HStack(spacing: 10) {
                            Button {
                                applicationsPage = 1
                            } label: {
                                Text("<<")
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                            .disabled(validApplicationsPage == 1)

                            Button {
                                applicationsPage = max(1, validApplicationsPage - 1)
                            } label: {
                                Text("<")
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                            .disabled(validApplicationsPage == 1)

                            Text(
                                String.localizedStringWithFormat(
                                    l("Page %d of %d"),
                                    validApplicationsPage,
                                    applicationsTotalPages
                                )
                            )
                            .font(Theme.font(size: 13, weight: .semibold))
                            .foregroundStyle(Theme.ink)

                            Button {
                                applicationsPage = min(applicationsTotalPages, validApplicationsPage + 1)
                            } label: {
                                Text(">")
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                            .disabled(validApplicationsPage == applicationsTotalPages)

                            Button {
                                applicationsPage = applicationsTotalPages
                            } label: {
                                Text(">>")
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                            .disabled(validApplicationsPage == applicationsTotalPages)
                        }
                        .padding(.top, 8)
                        .frame(maxWidth: .infinity, alignment: .center)
                    }
                }
            }
        }
    }

    private var applicantApplicationsHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            VStack(alignment: .leading, spacing: 4) {
                Text(l("My applications"))
                    .font(Theme.font(size: 12, weight: .bold))
                    .foregroundStyle(Color.white.opacity(0.85))
                    .textCase(.uppercase)
                    .kerning(2.4)
                Text("\(sortedApplications.count) \(l("active applications"))")
                    .font(Theme.font(size: 14))
                    .foregroundStyle(Color.white.opacity(0.75))
            }

            Text("\(applications.count) \(l("total"))")
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

    private var loadingApplicantApplicationsRows: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(0..<2, id: \.self) { index in
                VStack(alignment: .leading, spacing: 8) {
                    IRefairSkeletonBlock(height: 16, cornerRadius: 8, delay: Double(index) * 0.04)
                    IRefairSkeletonBlock(height: 12, cornerRadius: 8, delay: Double(index) * 0.04 + 0.03)
                    IRefairSkeletonBlock(height: 12, cornerRadius: 8, delay: Double(index) * 0.04 + 0.06)
                }
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.white.opacity(0.6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(Color(hex: 0x0F172A).opacity(0.09), lineWidth: 1)
                        )
                )
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(l("Loading..."))
    }

    private func applicantApplicationRow(_ application: ApplicantPortalApplication) -> some View {
        let normalizedStatus = (application.status ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let hasMeeting = normalizedStatus == "meeting scheduled"
            && !(application.meetingDate ?? "").isEmpty
            && !(application.meetingTime ?? "").isEmpty
        let timestamp = parseTimestamp(application.timestamp)
        let dateLabel = timestamp == .distantPast
            ? ""
            : DateFormatter.localizedString(from: timestamp, dateStyle: .medium, timeStyle: .none)
        let meetingDetails = hasMeeting
            ? formatMeetingDetails(date: application.meetingDate, time: application.meetingTime, timezone: application.meetingTimezone)
            : l("No meeting scheduled")

        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(application.id)
                        .font(Theme.font(.headline, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                    if !dateLabel.isEmpty {
                        Text(dateLabel)
                            .font(Theme.font(.caption))
                            .foregroundStyle(Theme.muted)
                    }
                }
                Spacer(minLength: 12)
                Text(localizedApplicationStatus(application.status))
                    .font(Theme.font(size: 12, weight: .semibold))
                    .foregroundStyle(statusColor(for: application.status))
                    .padding(.vertical, 5)
                    .padding(.horizontal, 10)
                    .background(
                        Capsule(style: .continuous)
                            .fill(statusColor(for: application.status).opacity(0.12))
                            .overlay(
                                Capsule(style: .continuous)
                                    .stroke(statusColor(for: application.status).opacity(0.28), lineWidth: 1)
                            )
                    )
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(application.position?.isEmpty == false ? application.position ?? "" : "-")
                    .font(Theme.font(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                Text("\(l("iRCRN")): \(application.iCrn?.isEmpty == false ? application.iCrn ?? "" : "-")")
                    .font(Theme.font(.caption))
                    .foregroundStyle(Theme.muted)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(l("Meeting"))
                    .font(Theme.font(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.muted)
                Text(meetingDetails)
                    .font(Theme.font(size: 13))
                    .foregroundStyle(hasMeeting ? Theme.ink : Theme.muted)
                if hasMeeting, let urlString = application.meetingUrl, let meetingURL = URL(string: urlString), !urlString.isEmpty {
                    Link(l("Join"), destination: meetingURL)
                        .font(Theme.font(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.accentPrimary)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white.opacity(0.7))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color(hex: 0x0F172A).opacity(0.1), lineWidth: 1)
                )
        )
    }

    private var useLandscapeActionRow: Bool {
        verticalSizeClass == .compact || horizontalSizeClass == .regular
    }

    private func clearActionButton(fillWidth: Bool) -> some View {
        Button(l("Clear form")) {
            resetForm()
        }
        .frame(maxWidth: fillWidth ? .infinity : nil)
        .buttonStyle(IRefairGhostButtonStyle(fillWidth: fillWidth))
        .disabled(isSubmitting)
    }

    private func submitActionButton(fillWidth: Bool) -> some View {
        Button {
            Task { await submit() }
        } label: {
            if isSubmitting {
                HStack(spacing: 8) {
                    Text(l("Submitting..."))
                    ProgressView().tint(.white)
                }
            } else {
                Text(l("Send referral request"))
            }
        }
        .frame(maxWidth: fillWidth ? .infinity : nil)
        .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: fillWidth))
        .disabled(isSubmitting || !networkMonitor.isConnected)
    }

    private func localizedApplicationStatus(_ status: String?) -> String {
        let normalized = (status ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let fr = AppLocale.languageCode == "fr"
        switch normalized {
        case "new":
            return fr ? "Nouveau" : "New"
        case "meeting requested":
            return fr ? "Réunion demandée" : "Meeting Requested"
        case "meeting scheduled":
            return fr ? "Réunion planifiée" : "Meeting Scheduled"
        case "needs reschedule":
            return fr ? "À replanifier" : "Needs Reschedule"
        case "met with referrer", "interviewed":
            return fr ? "Rencontré avec le référent" : "Met with Referrer"
        case "submitted cv to hr":
            return fr ? "CV transmis aux RH" : "Submitted CV to HR"
        case "interviews being conducted":
            return fr ? "Entretiens en cours" : "Interviews Being Conducted"
        case "job offered":
            return fr ? "Offre d'emploi" : "Job Offered"
        case "landed job":
            return fr ? "Poste accepté" : "Landed Job"
        case "not a good fit":
            return fr ? "Profil non retenu" : "Not a Good Fit"
        case "applicant no longer interested":
            return fr ? "Le candidat n'est plus intéressé" : "Applicant No Longer Interested"
        case "applicant decided not to move forward":
            return fr ? "Le candidat a décidé de ne pas poursuivre" : "Applicant Decided Not to Move Forward"
        case "hr decided not to proceed":
            return fr ? "Les RH ont décidé de ne pas poursuivre" : "HR Decided Not to Proceed"
        case "another applicant was a better fit":
            return fr ? "Un autre candidat correspondait mieux" : "Another Applicant Was a Better Fit"
        case "candidate did not accept offer":
            return fr ? "Le candidat n'a pas accepté l'offre" : "Candidate Did Not Accept Offer"
        case "cv mismatch":
            return fr ? "CV inadapté" : "CV Mismatch"
        case "cv update requested":
            return fr ? "Mise à jour CV demandée" : "CV Update Requested"
        case "cv updated":
            return fr ? "CV mis à jour" : "CV Updated"
        case "info requested":
            return fr ? "Informations demandées" : "Info Requested"
        case "info updated":
            return fr ? "Informations mises à jour" : "Info Updated"
        case "ineligible":
            return fr ? "Non admissible" : "Ineligible"
        default:
            let fallback = status?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            return fallback.isEmpty ? (fr ? "Nouveau" : "New") : fallback
        }
    }

    private func statusColor(for status: String?) -> Color {
        let normalized = (status ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch normalized {
        case "new", "meeting requested", "submitted cv to hr", "interviews being conducted":
            return Theme.info
        case "meeting scheduled", "met with referrer", "interviewed", "job offered", "landed job", "cv updated", "info updated":
            return Theme.success
        case "needs reschedule", "cv mismatch", "cv update requested", "info requested":
            return Theme.warning
        case "not a good fit", "hr decided not to proceed", "ineligible":
            return Theme.error
        default:
            return Theme.muted
        }
    }

    private func formatMeetingDetails(date: String?, time: String?, timezone: String?) -> String {
        let cleanDate = (date ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanTime = (time ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanDate.isEmpty || cleanTime.isEmpty {
            return l("No meeting scheduled")
        }

        let cleanTimezone = (timezone ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let timezoneLabel = cleanTimezone
            .split(separator: "/")
            .last
            .map { $0.replacingOccurrences(of: "_", with: " ") } ?? ""
        if timezoneLabel.isEmpty {
            return AppLocale.languageCode == "fr"
                ? "\(cleanDate) à \(cleanTime)"
                : "\(cleanDate) at \(cleanTime)"
        }
        return AppLocale.languageCode == "fr"
            ? "\(cleanDate) à \(cleanTime) (\(timezoneLabel))"
            : "\(cleanDate) at \(cleanTime) (\(timezoneLabel))"
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    private func fieldAnchorId(for key: String) -> String {
        "applicant-validation-field-\(key)"
    }

    private func scrollToFirstValidationError(_ key: String?) {
        guard let key else { return }
        let target = fieldAnchorId(for: key)
        validationScrollTarget = nil
        DispatchQueue.main.async {
            validationScrollTarget = target
        }
    }

    private func pickerDisplayValue(_ value: String, options: [(value: String, label: String)]) -> String {
        guard !value.isEmpty else { return l("Select") }
        return options.first(where: { $0.value == value })?.label ?? value
    }

    @ViewBuilder
    private func consentPointRow(_ pointKey: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "circle.fill")
                .font(.system(size: 6, weight: .semibold))
                .foregroundStyle(Theme.ink)
                .padding(.top, 7)

            Text(localizedConsentPoint(pointKey))
                .font(Theme.font(size: 16))
                .foregroundStyle(Theme.ink)
                .tint(Color(hex: 0x063770))
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func localizedConsentPoint(_ key: String) -> AttributedString {
        let localized = l(key)
        let email = "irefair@andbeyondca.com"
        let englishLinkText = l("contacting us via email")
        let frenchLinkText = l("nous contactant par courriel")
        var markdown = localized

        if markdown.contains(englishLinkText) {
            markdown = markdown.replacingOccurrences(
                of: englishLinkText,
                with: "[\(englishLinkText)](mailto:\(email))"
            )
        }
        if markdown.contains(frenchLinkText) {
            markdown = markdown.replacingOccurrences(
                of: frenchLinkText,
                with: "[\(frenchLinkText)](mailto:\(email))"
            )
        }

        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: markdown, options: options)) ?? AttributedString(localized)
    }

    private var yesNoOptions: [(value: String, label: String)] {
        [
            (value: "Yes", label: l("Yes")),
            (value: "No", label: l("No")),
        ]
    }

    private var languageOptions: [(value: String, label: String)] {
        return languageValues.map { value in
            (value: value, label: l(value))
        }
    }

    private var employmentOptions: [(value: String, label: String)] {
        return employmentValues.map { value in
            (value: value, label: l(value))
        }
    }

    private var industryOptions: [(value: String, label: String)] {
        return industryValues.map { value in
            (value: value, label: l(value))
        }
    }

    private var requiresResume: Bool {
        if updateToken.isEmpty || updateAppId.isEmpty {
            return true
        }
        return updatePurpose.lowercased() != "info"
    }

    private func allowedTypes() -> [UTType] {
        var types: [UTType] = [.pdf]
        if let doc = UTType(filenameExtension: "doc") { types.append(doc) }
        if let docx = UTType(filenameExtension: "docx") { types.append(docx) }
        return types
    }

    private func handlePickedFile(_ url: URL) {
        do {
            guard FileSupport.isSupportedResume(url) else {
                let message = l("Please upload a PDF or DOC/DOCX file under 10MB.")
                fieldErrors["resume"] = message
                errorMessage = message
                return
            }
            let data = try FileReader.loadData(from: url)
            guard data.count <= FileSupport.maxResumeSize else {
                let message = l("Please upload a PDF or DOC/DOCX file under 10MB.")
                fieldErrors["resume"] = message
                errorMessage = message
                return
            }
            resumeName = url.lastPathComponent
            resumeFile = UploadFile(
                fieldName: "resume",
                fileName: url.lastPathComponent,
                mimeType: FileSupport.mimeType(for: url),
                data: data
            )
            fieldErrors["resume"] = nil
        } catch {
            errorMessage = l("Unable to load the selected file.")
        }
    }

    @MainActor
    private func loadPrefill() async {
        errorMessage = nil
        statusMessage = nil
        guard !updateToken.isEmpty, !updateAppId.isEmpty else {
            return
        }
        guard !isPrefillLoading else { return }
        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            errorMessage = l("App configuration is missing API base URL.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.")
            return
        }

        isPrefillLoading = true
        defer { isPrefillLoading = false }

        do {
            let response = try await APIClient.loadApplicantPrefill(
                baseURL: apiBaseURL,
                updateToken: updateToken,
                appId: updateAppId
            )
            guard let data = response.data else {
                applications = []
                errorMessage = l("Unable to load your details.")
                return
            }
            applications = response.applications ?? []
            applicationsPage = 1
            updatePurpose = response.updatePurpose ?? "cv"
            if updatePurpose.lowercased() == "info" {
                fieldErrors["resume"] = nil
            }
            firstName = data.firstName
            middleName = data.middleName
            familyName = data.familyName
            email = data.email
            phone = data.phone
            locatedCanada = data.locatedCanada
            province = data.province
            authorizedCanada = data.authorizedCanada
            eligibleMoveCanada = data.eligibleMoveCanada
            countryOfOrigin = data.countryOfOrigin
            industryType = data.industryType
            industryOther = data.industryOther
            employmentStatus = data.employmentStatus
            linkedin = data.linkedin
            languagesOther = data.languagesOther

            let languageList = data.languages
                .split(separator: ",")
                .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                .filter { !$0.isEmpty }
            languages = Set(languageList)
            if !data.resumeFileName.isEmpty {
                resumeName = data.resumeFileName
            }
            statusMessage = l("Details loaded. Update your information and submit.")
            Telemetry.track("applicant_prefill_loaded", properties: ["purpose": updatePurpose])
        } catch {
            Telemetry.capture(error)
            applications = []
            errorMessage = error.localizedDescription
        }
    }

    private func validate() -> Bool {
        var errors: [String: String] = [:]
        var firstErrorKey: String?

        func addError(_ key: String, _ message: String) {
            if firstErrorKey == nil {
                firstErrorKey = key
            }
            errors[key] = message
        }

        if firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            addError("firstName", l("Please enter your first name."))
        }
        if familyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            addError("familyName", l("Please enter your family name."))
        }
        let emailValue = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if emailValue.isEmpty {
            addError("email", l("Please enter your email address."))
        } else if !Validator.isValidEmail(emailValue) {
            addError("email", l("Please enter a valid email address."))
        }
        if phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            addError("phone", l("Please enter your phone number."))
        }
        if countryOfOrigin.isEmpty {
            addError("countryOfOrigin", l("Please select your country of origin."))
        }
        if languages.isEmpty {
            addError("languages", l("Please select at least one language."))
        }
        if languages.contains("Other") && languagesOther.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            addError("languagesOther", l("Please specify the other language."))
        }
        if locatedCanada.isEmpty {
            addError("locatedCanada", l("Please select your current location status."))
        }
        if locatedCanada == "Yes" {
            if province.isEmpty {
                addError("province", l("Please select your province."))
            }
            if authorizedCanada.isEmpty {
                addError("authorizedCanada", l("Please confirm your work authorization."))
            }
        }
        if locatedCanada == "No" && eligibleMoveCanada.isEmpty {
            addError("eligibleMoveCanada", l("Please confirm if you can move and work in Canada in the next 6 months."))
        }
        if industryType.isEmpty {
            addError("industryType", l("Please select an industry type."))
        }
        if industryType == "Other" && industryOther.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            addError("industryOther", l("Please specify the other industry type."))
        }
        if employmentStatus.isEmpty {
            addError("employmentStatus", l("Please select your employment status."))
        }
        if !Validator.isValidLinkedInProfile(linkedin) {
            addError("linkedin", l("Please enter a valid LinkedIn profile URL."))
        }
        if requiresResume && resumeFile == nil {
            addError("resume", l("Please upload your resume / CV."))
        }
        if !consent {
            addError("consent", l("Consent is required."))
        }

        fieldErrors = errors
        scrollToFirstValidationError(firstErrorKey)
        return errors.isEmpty
    }

    private func resetForm() {
        firstName = ""
        middleName = ""
        familyName = ""
        email = ""
        phone = ""
        countryOfOrigin = ""
        languages = []
        languagesOther = ""
        locatedCanada = ""
        province = ""
        authorizedCanada = ""
        eligibleMoveCanada = ""
        industryType = ""
        industryOther = ""
        employmentStatus = ""
        linkedin = ""
        consent = false
        resumeFile = nil
        resumeName = ""
        fieldErrors = [:]
        errorMessage = nil
        statusMessage = nil
        showSuccessModal = false
        submittedEmail = ""
        successModalVariant = .default
    }

    private func buildPayload() -> [String: String] {
        let languagesValue = languages.sorted().joined(separator: ", ")
        var payload: [String: String] = [
            "firstName": firstName.trimmingCharacters(in: .whitespacesAndNewlines),
            "middleName": middleName.trimmingCharacters(in: .whitespacesAndNewlines),
            "familyName": familyName.trimmingCharacters(in: .whitespacesAndNewlines),
            "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
            "phone": phone.trimmingCharacters(in: .whitespacesAndNewlines),
            "linkedin": linkedin.trimmingCharacters(in: .whitespacesAndNewlines),
            "locatedCanada": locatedCanada,
            "province": province,
            "authorizedCanada": authorizedCanada,
            "eligibleMoveCanada": eligibleMoveCanada,
            "countryOfOrigin": countryOfOrigin,
            "industryType": industryType,
            "industryOther": industryOther,
            "employmentStatus": employmentStatus,
            "languages": languagesValue,
            "languagesOther": languagesOther,
            "language": AppLocale.languageCode,
            "website": "",
        ]
        if !updateToken.isEmpty && !updateAppId.isEmpty {
            payload["updateRequestToken"] = updateToken
            payload["updateRequestApplicationId"] = updateAppId
        }
        return payload
    }

    @MainActor
    private func submit() async {
        errorMessage = nil
        statusMessage = nil
        guard validate() else { return }
        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            errorMessage = l("App configuration is missing API base URL.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.")
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let payload = buildPayload()
            let response = try await APIClient.submitApplicant(
                baseURL: apiBaseURL,
                payload: payload,
                resume: resumeFile
            )
            statusMessage = response.message ?? l("We've received your request. We'll follow up by email soon.")
            submittedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
            let confirmationStatus = response.confirmationEmailStatus?.lowercased()
            if confirmationStatus == "recent" {
                successModalVariant = .confirmationLinkRecent
            } else if confirmationStatus == "first" {
                successModalVariant = .default
            } else {
                successModalVariant = .confirmationLink
            }
            showSuccessModal = true
            if !updateToken.isEmpty && !updateAppId.isEmpty {
                updatePurpose = ""
                updateToken = ""
                updateAppId = ""
                storedUpdateToken = ""
                storedUpdateAppId = ""
                applications = []
                applicationsPage = 1
            }
            Telemetry.track("applicant_submit_success")
        } catch {
            Telemetry.capture(error)
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    ApplicantView()
        .environmentObject(NetworkMonitor())
}

struct ApplicantPortalView: View {
    private enum MessageTarget: Hashable {
        case signIn
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

    private let apiBaseURL: String = APIConfig.baseURL
    private let applicationsPageSize = 10
    private let loadingRows = 2

    @EnvironmentObject private var networkMonitor: NetworkMonitor
    @EnvironmentObject private var applicantPortalAccountStore: ApplicantPortalAccountStore

    @State private var accessToken = ""
    @State private var loginIrain = ""
    @State private var loginApplicantKey = ""
    @State private var didBootstrapSession = false
    @State private var isSigningIn = false
    @State private var isSigningOut = false
    @State private var isSigningOutAll = false

    @State private var applicant: ApplicantPortalSummary?
    @State private var applications: [ApplicantPortalApplication] = []
    @State private var totalApplications: Int?
    @State private var isLoading = false
    @State private var messages: [MessageTarget: InlineMessage] = [:]
    @State private var applicationsPage = 1

    @State private var isAccountManagerPresented = false

    private static let isoTimestampFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let isoTimestampFallbackFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private var hasAnySavedAccounts: Bool {
        !applicantPortalAccountStore.accounts.isEmpty
    }

    private var activeAccount: ApplicantPortalAccount? {
        applicantPortalAccountStore.activeAccount
    }

    private var activeAccountLabel: String {
        activeAccount?.pickerLabel ?? l("No portal account selected.")
    }

    private var isBusySigningOut: Bool {
        isSigningOut || isSigningOutAll
    }

    private var sortedApplications: [ApplicantPortalApplication] {
        applications.sorted { lhs, rhs in
            let lhsDate = parseTimestamp(lhs.timestamp)
            let rhsDate = parseTimestamp(rhs.timestamp)
            return lhsDate > rhsDate
        }
    }

    private var applicationsTotalPages: Int {
        max(1, Int(ceil(Double(max(sortedApplications.count, 1)) / Double(applicationsPageSize))))
    }

    private var validApplicationsPage: Int {
        min(max(1, applicationsPage), applicationsTotalPages)
    }

    private var paginatedApplications: [ApplicantPortalApplication] {
        let start = (validApplicationsPage - 1) * applicationsPageSize
        guard start < sortedApplications.count else { return [] }
        let end = min(start + applicationsPageSize, sortedApplications.count)
        return Array(sortedApplications[start..<end])
    }

    private var totalApplicationsCount: Int {
        totalApplications ?? applications.count
    }

    var body: some View {
        IRefairForm {
            IRefairCardHeader(
                eyebrow: l("Applicant portal"),
                title: l("Track your applications"),
                lead: l("Review every iRefair application you've submitted from one place.")
            )

            if !networkMonitor.isConnected {
                IRefairSection {
                    StatusBanner(text: l("You're offline. Connect to the internet to load portal data."), style: .warning)
                }
            }

            if hasAnySavedAccounts {
                accountTopBarSection

                if let applicant {
                    applicantMeta(applicant)
                }

                if isLoading {
                    applicationsBlock {
                        loadingApplicantApplicationsRows
                    }
                } else if !sortedApplications.isEmpty {
                    applicationsBlock {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(paginatedApplications) { application in
                                applicantApplicationRow(application)
                            }
                        }
                        if applicationsTotalPages > 1 {
                            paginationControls
                        }
                    }
                } else if applicant != nil {
                    applicationsBlock {
                        IRefairTableEmptyState(
                            title: l("No applications yet"),
                            description: l("Your submitted applications will appear here once they are available."),
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
        .onChange(of: applicantPortalAccountStore.activeAccountIrain) { _ in
            applicationsPage = 1
        }
        .sheet(isPresented: $isAccountManagerPresented) {
            portalAccountManagementSheet
        }
    }

    private var accountTopBarSection: some View {
        IRefairSection {
            HStack(alignment: .center, spacing: 10) {
                Menu {
                    ForEach(applicantPortalAccountStore.accounts) { account in
                        Button {
                            Task { await switchPortalAccount(to: account.normalizedIrain) }
                        } label: {
                            if account.normalizedIrain == activeAccount?.normalizedIrain {
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

                        if applicantPortalAccountStore.accounts.count > 1 {
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
                .disabled(applicantPortalAccountStore.accounts.count < 2)

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
                title: l("Sign in to your applicant portal"),
                description: l("Add your applicant portal account to review all submitted applications."),
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
            ForEach(applicantPortalAccountStore.accounts) { account in
                portalAccountRow(account)
                if account.id != applicantPortalAccountStore.accounts.last?.id {
                    Divider()
                        .background(Color.white.opacity(0.16))
                }
            }

            if let message = messages[.signOut] {
                StatusBanner(text: message.text, style: message.style)
            }

            if applicantPortalAccountStore.accounts.count > 1 {
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

    private func portalAccountRow(_ account: ApplicantPortalAccount) -> some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .center, spacing: 8) {
                    if account.normalizedIrain == activeAccount?.normalizedIrain {
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
                Task { await signOutPortalAccount(irain: account.normalizedIrain) }
            }
            .buttonStyle(IRefairGhostButtonStyle())
            .disabled(isBusySigningOut)
        }
    }

    private var signInSection: some View {
        IRefairSection(l("Sign in to your applicant portal")) {
            IRefairField(l("Applicant ID (iRAIN) *")) {
                IRefairTextField("", text: $loginIrain)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
            }
            IRefairField(l("Applicant Key *")) {
                IRefairSecureField("", text: $loginApplicantKey)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }

            Button {
                Task { await signInToPortal() }
            } label: {
                HStack(spacing: 8) {
                    if isSigningIn {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(0.9)
                    }
                    Text(isSigningIn ? l("Signing in...") : l("Sign in to portal"))
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: true))
            .padding(.top, Theme.fieldLabelGap)
            .disabled(isSigningIn || !networkMonitor.isConnected || isBusySigningOut)

            if let message = messages[.signIn] {
                StatusBanner(text: message.text, style: message.style)
            }

            Text(l("Use the iRAIN and Applicant Key from your registration email."))
                .font(Theme.font(.caption))
                .foregroundStyle(Color.white.opacity(0.86))
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
                Text(l("My applications"))
                    .font(Theme.font(size: 12, weight: .bold))
                    .foregroundStyle(Color.white.opacity(0.85))
                    .textCase(.uppercase)
                    .kerning(2.4)
                Text("\(sortedApplications.count) \(l("active applications"))")
                    .font(Theme.font(size: 14))
                    .foregroundStyle(Color.white.opacity(0.75))
            }

            Text("\(totalApplicationsCount) \(l("total"))")
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
    }

    private func applicantMeta(_ applicant: ApplicantPortalSummary) -> some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(minimum: 0), spacing: 16, alignment: .leading),
                GridItem(.flexible(minimum: 0), spacing: 16, alignment: .leading),
            ],
            alignment: .leading,
            spacing: 12
        ) {
            metaItem(
                title: l("Applicant"),
                value: "\(applicant.displayName) - \(applicant.irain)"
            )
            metaItem(
                title: l("Email"),
                value: applicant.email.isEmpty ? l("No email on file") : applicant.email
            )
            metaItem(
                title: l("Total"),
                value: "\(totalApplicationsCount)"
            )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 2)
    }

    private func metaItem(title: String, value: String) -> some View {
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

    private var loadingApplicantApplicationsRows: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(0..<loadingRows, id: \.self) { index in
                VStack(alignment: .leading, spacing: 8) {
                    IRefairSkeletonBlock(height: 16, cornerRadius: 8, delay: Double(index) * 0.04)
                    IRefairSkeletonBlock(height: 12, cornerRadius: 8, delay: Double(index) * 0.04 + 0.03)
                    IRefairSkeletonBlock(height: 12, cornerRadius: 8, delay: Double(index) * 0.04 + 0.06)
                }
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.white.opacity(0.6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(Color(hex: 0x0F172A).opacity(0.09), lineWidth: 1)
                        )
                )
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(l("Loading..."))
    }

    private var paginationControls: some View {
        HStack(spacing: 10) {
            Button {
                applicationsPage = 1
            } label: {
                Text("<<")
            }
            .buttonStyle(IRefairGhostButtonStyle())
            .disabled(validApplicationsPage == 1)

            Button {
                applicationsPage = max(1, validApplicationsPage - 1)
            } label: {
                Text("<")
            }
            .buttonStyle(IRefairGhostButtonStyle())
            .disabled(validApplicationsPage == 1)

            Text(
                String.localizedStringWithFormat(
                    l("Page %d of %d"),
                    validApplicationsPage,
                    applicationsTotalPages
                )
            )
            .font(Theme.font(size: 13, weight: .semibold))
            .foregroundStyle(Theme.ink)

            Button {
                applicationsPage = min(applicationsTotalPages, validApplicationsPage + 1)
            } label: {
                Text(">")
            }
            .buttonStyle(IRefairGhostButtonStyle())
            .disabled(validApplicationsPage == applicationsTotalPages)

            Button {
                applicationsPage = applicationsTotalPages
            } label: {
                Text(">>")
            }
            .buttonStyle(IRefairGhostButtonStyle())
            .disabled(validApplicationsPage == applicationsTotalPages)
        }
        .padding(.top, 8)
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private func applicantApplicationRow(_ application: ApplicantPortalApplication) -> some View {
        let normalizedStatus = (application.status ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let hasMeeting = normalizedStatus == "meeting scheduled"
            && !(application.meetingDate ?? "").isEmpty
            && !(application.meetingTime ?? "").isEmpty
        let timestamp = parseTimestamp(application.timestamp)
        let dateLabel = timestamp == .distantPast
            ? ""
            : DateFormatter.localizedString(from: timestamp, dateStyle: .medium, timeStyle: .none)
        let meetingDetails = hasMeeting
            ? formatMeetingDetails(date: application.meetingDate, time: application.meetingTime, timezone: application.meetingTimezone)
            : l("No meeting scheduled")

        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(application.id)
                        .font(Theme.font(.headline, weight: .semibold))
                        .foregroundStyle(Theme.ink)
                    if !dateLabel.isEmpty {
                        Text(dateLabel)
                            .font(Theme.font(.caption))
                            .foregroundStyle(Theme.muted)
                    }
                }
                Spacer(minLength: 12)
                Text(localizedApplicationStatus(application.status))
                    .font(Theme.font(size: 12, weight: .semibold))
                    .foregroundStyle(statusColor(for: application.status))
                    .padding(.vertical, 5)
                    .padding(.horizontal, 10)
                    .background(
                        Capsule(style: .continuous)
                            .fill(statusColor(for: application.status).opacity(0.12))
                            .overlay(
                                Capsule(style: .continuous)
                                    .stroke(statusColor(for: application.status).opacity(0.28), lineWidth: 1)
                            )
                    )
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(application.position?.isEmpty == false ? application.position ?? "" : "-")
                    .font(Theme.font(size: 15, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                Text("\(l("iRCRN")): \(application.iCrn?.isEmpty == false ? application.iCrn ?? "" : "-")")
                    .font(Theme.font(.caption))
                    .foregroundStyle(Theme.muted)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(l("Meeting"))
                    .font(Theme.font(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.muted)
                Text(meetingDetails)
                    .font(Theme.font(size: 13))
                    .foregroundStyle(hasMeeting ? Theme.ink : Theme.muted)
                if hasMeeting,
                   let urlString = application.meetingUrl,
                   let meetingURL = URL(string: urlString),
                   !urlString.isEmpty
                {
                    Link(l("Join"), destination: meetingURL)
                        .font(Theme.font(size: 13, weight: .semibold))
                        .foregroundStyle(Theme.accentPrimary)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white.opacity(0.7))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color(hex: 0x0F172A).opacity(0.1), lineWidth: 1)
                )
        )
    }

    private func parseTimestamp(_ value: String?) -> Date {
        let trimmed = (value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return .distantPast
        }
        if let parsed = Self.isoTimestampFormatter.date(from: trimmed) {
            return parsed
        }
        if let parsed = Self.isoTimestampFallbackFormatter.date(from: trimmed) {
            return parsed
        }
        return .distantPast
    }

    private func localizedApplicationStatus(_ status: String?) -> String {
        let normalized = (status ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let fr = AppLocale.languageCode == "fr"
        switch normalized {
        case "new":
            return fr ? "Nouveau" : "New"
        case "meeting requested":
            return fr ? "Réunion demandée" : "Meeting Requested"
        case "meeting scheduled":
            return fr ? "Réunion planifiée" : "Meeting Scheduled"
        case "needs reschedule":
            return fr ? "À replanifier" : "Needs Reschedule"
        case "met with referrer", "interviewed":
            return fr ? "Rencontré avec le référent" : "Met with Referrer"
        case "submitted cv to hr":
            return fr ? "CV transmis aux RH" : "Submitted CV to HR"
        case "interviews being conducted":
            return fr ? "Entretiens en cours" : "Interviews Being Conducted"
        case "job offered":
            return fr ? "Offre d'emploi" : "Job Offered"
        case "landed job":
            return fr ? "Poste accepté" : "Landed Job"
        case "not a good fit":
            return fr ? "Profil non retenu" : "Not a Good Fit"
        case "applicant no longer interested":
            return fr ? "Le candidat n'est plus intéressé" : "Applicant No Longer Interested"
        case "applicant decided not to move forward":
            return fr ? "Le candidat a décidé de ne pas poursuivre" : "Applicant Decided Not to Move Forward"
        case "hr decided not to proceed":
            return fr ? "Les RH ont décidé de ne pas poursuivre" : "HR Decided Not to Proceed"
        case "another applicant was a better fit":
            return fr ? "Un autre candidat correspondait mieux" : "Another Applicant Was a Better Fit"
        case "candidate did not accept offer":
            return fr ? "Le candidat n'a pas accepté l'offre" : "Candidate Did Not Accept Offer"
        case "cv mismatch":
            return fr ? "CV inadapté" : "CV Mismatch"
        case "cv update requested":
            return fr ? "Mise à jour CV demandée" : "CV Update Requested"
        case "cv updated":
            return fr ? "CV mis à jour" : "CV Updated"
        case "info requested":
            return fr ? "Informations demandées" : "Info Requested"
        case "info updated":
            return fr ? "Informations mises à jour" : "Info Updated"
        case "ineligible":
            return fr ? "Non admissible" : "Ineligible"
        default:
            let fallback = status?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            return fallback.isEmpty ? (fr ? "Nouveau" : "New") : fallback
        }
    }

    private func statusColor(for status: String?) -> Color {
        let normalized = (status ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch normalized {
        case "new", "meeting requested", "submitted cv to hr", "interviews being conducted":
            return Theme.info
        case "meeting scheduled", "met with referrer", "interviewed", "job offered", "landed job", "cv updated", "info updated":
            return Theme.success
        case "needs reschedule", "cv mismatch", "cv update requested", "info requested":
            return Theme.warning
        case "not a good fit", "hr decided not to proceed", "ineligible":
            return Theme.error
        default:
            return Theme.muted
        }
    }

    private func formatMeetingDetails(date: String?, time: String?, timezone: String?) -> String {
        let cleanDate = (date ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanTime = (time ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanDate.isEmpty || cleanTime.isEmpty {
            return l("No meeting scheduled")
        }

        let cleanTimezone = (timezone ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let timezoneLabel = cleanTimezone
            .split(separator: "/")
            .last
            .map { $0.replacingOccurrences(of: "_", with: " ") } ?? ""
        if timezoneLabel.isEmpty {
            return AppLocale.languageCode == "fr"
                ? "\(cleanDate) à \(cleanTime)"
                : "\(cleanDate) at \(cleanTime)"
        }
        return AppLocale.languageCode == "fr"
            ? "\(cleanDate) à \(cleanTime) (\(timezoneLabel))"
            : "\(cleanDate) at \(cleanTime) (\(timezoneLabel))"
    }

    private func setMessage(_ text: String, style: StatusBanner.Style, for target: MessageTarget) {
        messages[target] = InlineMessage(text: text, style: style)
    }

    private func clearMessage(for target: MessageTarget) {
        messages.removeValue(forKey: target)
    }

    private func clearPortalData() {
        applicant = nil
        applications = []
        totalApplications = nil
        applicationsPage = 1
    }

    @MainActor
    private func switchPortalAccount(to irain: String) async {
        clearMessage(for: .switchAccount)

        let normalized = irain.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalized.isEmpty else { return }
        guard activeAccount?.normalizedIrain != normalized else { return }

        applicantPortalAccountStore.setActive(irain: normalized)
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

        guard networkMonitor.isConnected else { return }
        guard let activeAccount else { return }

        if accessToken.isEmpty {
            let refreshed = await refreshSession(for: activeAccount.normalizedIrain)
            guard refreshed else {
                setMessage(l("Session expired. Please sign in again."), style: .error, for: startupMessageTarget)
                return
            }
        }

        await loadPortal(messageTarget: startupMessageTarget, showSuccessMessage: false)
    }

    @MainActor
    private func signInToPortal() async {
        clearMessage(for: .signIn)

        let applicantId = loginIrain.trimmingCharacters(in: .whitespacesAndNewlines)
        let applicantKey = loginApplicantKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !applicantId.isEmpty, !applicantKey.isEmpty else {
            setMessage(l("Missing applicant credentials."), style: .error, for: .signIn)
            return
        }

        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            setMessage(l("App configuration is missing API base URL."), style: .error, for: .signIn)
            return
        }

        guard networkMonitor.isConnected else {
            setMessage(l("You're offline. Connect to the internet and try again."), style: .error, for: .signIn)
            return
        }

        isSigningIn = true
        defer { isSigningIn = false }

        await exchangeSession(applicantId: applicantId, applicantKey: applicantKey, messageTarget: .signIn)
    }

    @MainActor
    private func exchangeSession(applicantId: String, applicantKey: String, messageTarget: MessageTarget?) async {
        if let messageTarget {
            clearMessage(for: messageTarget)
        }
        clearMessage(for: .signOut)
        clearMessage(for: .signOutAll)
        clearMessage(for: .switchAccount)

        isLoading = true
        defer { isLoading = false }

        guard networkMonitor.isConnected else {
            if let messageTarget {
                setMessage(l("You're offline. Connect to the internet and try again."), style: .error, for: messageTarget)
            }
            return
        }

        do {
            let response = try await APIClient.exchangeApplicantMobileSession(
                baseURL: apiBaseURL,
                applicantId: applicantId,
                applicantKey: applicantKey
            )

            guard let newAccessToken = response.accessToken,
                  !newAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let newRefreshToken = response.refreshToken,
                  !newRefreshToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw APIError(message: l("Unable to establish session. Please try again."))
            }

            guard let responseApplicant = response.applicant else {
                throw APIError(message: l("Unable to load your details."))
            }

            accessToken = newAccessToken
            applicantPortalAccountStore.upsertAccount(
                from: responseApplicant,
                refreshToken: newRefreshToken,
                makeActive: true
            )
            applicant = responseApplicant
            loginApplicantKey = ""

            if let messageTarget {
                setMessage(l("Signed in. Loading portal data..."), style: .success, for: messageTarget)
            }
            await loadPortal(messageTarget: messageTarget)
        } catch {
            Telemetry.capture(error)
            if let messageTarget {
                setMessage(error.localizedDescription, style: .error, for: messageTarget)
            }
        }
    }

    @MainActor
    private func refreshSession(for irain: String) async -> Bool {
        let refreshToken = applicantPortalAccountStore.refreshToken(for: irain)
        guard !refreshToken.isEmpty else {
            return false
        }

        do {
            let response = try await APIClient.refreshApplicantMobileSession(baseURL: apiBaseURL, refreshToken: refreshToken)
            guard let newAccessToken = response.accessToken,
                  !newAccessToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let newRefreshToken = response.refreshToken,
                  !newRefreshToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw APIError(message: l("Session expired. Please sign in again."))
            }

            accessToken = newAccessToken
            _ = applicantPortalAccountStore.saveRefreshToken(newRefreshToken, for: irain)
            return true
        } catch {
            Telemetry.capture(error)
            accessToken = ""
            clearPortalData()
            applicantPortalAccountStore.clearRefreshToken(for: irain)
            return false
        }
    }

    @MainActor
    private func signOutPortalAccount(irain: String) async {
        clearMessage(for: .signOut)
        clearMessage(for: .signOutAll)
        clearMessage(for: .switchAccount)

        let normalizedIrain = irain.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !normalizedIrain.isEmpty else {
            setMessage(l("No portal account selected."), style: .error, for: .signOut)
            return
        }
        guard applicantPortalAccountStore.account(for: normalizedIrain) != nil else { return }

        isSigningOut = true
        defer { isSigningOut = false }

        let refreshToken = applicantPortalAccountStore.refreshToken(for: normalizedIrain)
        if !refreshToken.isEmpty {
            _ = try? await APIClient.logoutApplicantMobileSession(baseURL: apiBaseURL, refreshToken: refreshToken)
        }

        let wasActiveAccount = activeAccount?.normalizedIrain == normalizedIrain
        applicantPortalAccountStore.removeAccount(irain: normalizedIrain)

        if wasActiveAccount {
            accessToken = ""
            clearPortalData()
        }

        if applicantPortalAccountStore.accounts.isEmpty {
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

        let accounts = applicantPortalAccountStore.accounts
        for account in accounts {
            let refreshToken = applicantPortalAccountStore.refreshToken(for: account.normalizedIrain)
            if !refreshToken.isEmpty {
                _ = try? await APIClient.logoutApplicantMobileSession(baseURL: apiBaseURL, refreshToken: refreshToken)
            }
        }

        applicantPortalAccountStore.removeAllAccounts()
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
        let activeIrain = activeAccount.normalizedIrain

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

        isLoading = true
        defer { isLoading = false }

        if accessToken.isEmpty {
            let refreshed = await refreshSession(for: activeIrain)
            if !refreshed {
                if let messageTarget {
                    setMessage(l("Session expired. Please sign in again."), style: .error, for: messageTarget)
                }
                return
            }
        }

        do {
            let response = try await APIClient.loadApplicantPortal(baseURL: apiBaseURL, token: accessToken)
            guard applicantPortalAccountStore.activeAccountIrain == activeIrain else { return }
            if let responseApplicant = response.applicant {
                applicant = responseApplicant
                applicantPortalAccountStore.upsertAccount(from: responseApplicant, makeActive: false)
            } else {
                applicant = nil
            }
            applications = response.applications ?? []
            totalApplications = response.total
            applicationsPage = 1
            if applicant == nil, applications.isEmpty {
                if let messageTarget {
                    setMessage(l("Unable to load your details."), style: .error, for: messageTarget)
                }
                return
            }
            if let messageTarget, showSuccessMessage {
                setMessage(
                    String.localizedStringWithFormat(l("Loaded %d applications."), applications.count),
                    style: .success,
                    for: messageTarget
                )
            }
            Telemetry.track("applicant_portal_loaded", properties: ["count": "\(applications.count)"])
        } catch {
            let refreshed = await refreshSession(for: activeIrain)
            if refreshed {
                do {
                    let retryResponse = try await APIClient.loadApplicantPortal(baseURL: apiBaseURL, token: accessToken)
                    guard applicantPortalAccountStore.activeAccountIrain == activeIrain else { return }
                    if let retryApplicant = retryResponse.applicant {
                        applicant = retryApplicant
                        applicantPortalAccountStore.upsertAccount(from: retryApplicant, makeActive: false)
                    } else {
                        applicant = nil
                    }
                    applications = retryResponse.applications ?? []
                    totalApplications = retryResponse.total
                    applicationsPage = 1
                    if applicant == nil, applications.isEmpty {
                        if let messageTarget {
                            setMessage(l("Unable to load your details."), style: .error, for: messageTarget)
                        }
                        return
                    }
                    if let messageTarget, showSuccessMessage {
                        setMessage(
                            String.localizedStringWithFormat(l("Loaded %d applications."), applications.count),
                            style: .success,
                            for: messageTarget
                        )
                    }
                    Telemetry.track("applicant_portal_loaded", properties: ["count": "\(applications.count)"])
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

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }
}

#Preview("Applicant Portal") {
    ApplicantPortalView()
        .environmentObject(NetworkMonitor())
        .environmentObject(ApplicantPortalAccountStore())
}
