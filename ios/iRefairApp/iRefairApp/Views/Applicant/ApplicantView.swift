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

    @State private var isSubmitting = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    @State private var fieldErrors: [String: String] = [:]
    @State private var validationScrollTarget: String?
    @State private var showSuccessModal = false
    @State private var successModalVariant: SubmissionSuccessVariant = .default
    @State private var submittedEmail = ""

    private let languageValues = ["English", "Arabic", "French", "Other"]
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
                    }
                }
                .onChange(of: storedUpdateToken) { value in
                    updateToken = value
                    if !updateToken.isEmpty && !updateAppId.isEmpty {
                        Task { await loadPrefill() }
                    }
                }
                .onChange(of: storedUpdateAppId) { value in
                    updateAppId = value
                    if !updateToken.isEmpty && !updateAppId.isEmpty {
                        Task { await loadPrefill() }
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
                errorMessage = l("Unable to load your details.")
                return
            }
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
