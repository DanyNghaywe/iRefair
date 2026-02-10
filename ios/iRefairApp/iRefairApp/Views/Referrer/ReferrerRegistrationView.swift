import SwiftUI

struct ReferrerRegistrationView: View {
    private let apiBaseURL: String = APIConfig.baseURL

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass
    @EnvironmentObject private var networkMonitor: NetworkMonitor

    @State private var fullName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var country = ""
    @State private var company = ""
    @State private var careersPortal = ""
    @State private var companyIndustry = ""
    @State private var companyIndustryOther = ""
    @State private var workType = ""
    @State private var linkedIn = ""
    @State private var consent = false

    @State private var isSubmitting = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    @State private var fieldErrors: [String: String] = [:]
    @State private var validationScrollTarget: String?
    @State private var showSuccessModal = false
    @State private var successModalVariant: SubmissionSuccessVariant = .referrerNew

    private let companyIndustryValues = [
        "Technology",
        "Finance",
        "Healthcare",
        "Education",
        "Retail",
        "Hospitality",
        "Marketing / Media",
        "Engineering / Construction",
        "Consulting",
        "Not for profit",
        "Compliance / Audit",
        "Other",
    ]

    private let workTypeValues = ["On-site", "Remote", "Hybrid"]
    private let referrerConsentPoints = [
        "iRefair is a voluntary, community-driven initiative, and I am under no obligation to make any referrals.",
        "Any referral I make is based on my own discretion, and I am solely responsible for complying with my company’s internal referral or hiring policies.",
        "iRefair, &Beyond Consulting, IM Power SARL and Inaspire and their legal founders assume no liability at all including but not limited to: hiring outcomes, internal processes, or employer decisions.",
        "My contact and employer details will be kept confidential and will not be shared without my consent.",
        "I may request to update or delete my information at any time by contacting us via email.",
        "My participation is entirely optional, and I can opt out at any time by contacting us via email.",
    ]

    var body: some View {
        ScrollViewReader { scrollProxy in
            IRefairForm {
                IRefairCardHeader(
                    eyebrow: l("For referrers"),
                    title: l("Referrer referral form"),
                    lead: l("Share the teams, roles, and capacity you have. Log an applicant now or just your availability.")
                )

                if !networkMonitor.isConnected {
                    IRefairSection {
                        StatusBanner(text: l("You're offline. Connect to the internet to submit the form."), style: .warning)
                    }
                }

                IRefairSection(l("Personal Information")) {
                    IRefairField(l("Full Name")) {
                        IRefairTextField("", text: $fullName)
                            .accessibilityLabel(l("Full Name"))
                    }
                    .id(fieldAnchorId(for: "name"))
                    errorText("name")
                    IRefairField(l("Email address")) {
                        IRefairTextField("", text: $email)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .accessibilityLabel(l("Email address"))
                    }
                    .id(fieldAnchorId(for: "email"))
                    errorText("email")
                    IRefairField(l("Phone Number")) {
                        IRefairTextField(l("+1-XXX-XXXX or +961-XX-XXXXXX"), text: $phone)
                            .accessibilityLabel(l("Phone Number"))
                    }
                    .id(fieldAnchorId(for: "phone"))
                    errorText("phone")
                    IRefairMenuPicker(
                        l("Country of Origin"),
                        displayValue: country.isEmpty ? l("Select") : country,
                        isPlaceholder: country.isEmpty,
                        selection: $country
                    ) {
                        Text(l("Select")).tag("")
                        ForEach(CountryData.all, id: \.self) { item in
                            Text(item).tag(item)
                        }
                    }
                    .id(fieldAnchorId(for: "country"))
                    errorText("country")
                    IRefairField(l("LinkedIn Profile (optional)")) {
                        IRefairTextField(l("https://linkedin.com/in/"), text: $linkedIn)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .accessibilityLabel(l("LinkedIn Profile (optional)"))
                    }
                    .id(fieldAnchorId(for: "linkedIn"))
                    errorText("linkedIn")
                }

                IRefairSection(l("Company Details")) {
                    IRefairField(l("Company Name (optional)")) {
                        IRefairTextField("", text: $company)
                            .accessibilityLabel(l("Company Name (optional)"))
                    }
                    IRefairMenuPicker(
                        l("Industry of the company"),
                        displayValue: pickerDisplayValue(companyIndustry, options: companyIndustryOptions),
                        isPlaceholder: companyIndustry.isEmpty,
                        selection: $companyIndustry
                    ) {
                        Text(l("Select")).tag("")
                        ForEach(companyIndustryOptions, id: \.value) { item in
                            Text(item.label).tag(item.value)
                        }
                    }
                    .id(fieldAnchorId(for: "companyIndustry"))
                    errorText("companyIndustry")
                    if companyIndustry == "Other" {
                        IRefairField(l("Other company industry")) {
                            IRefairTextField(l("Please specify"), text: $companyIndustryOther)
                                .accessibilityLabel(l("Other company industry"))
                        }
                        .id(fieldAnchorId(for: "companyIndustryOther"))
                        errorText("companyIndustryOther")
                    }
                    IRefairMenuPicker(
                        l("Type of work"),
                        displayValue: pickerDisplayValue(workType, options: workTypeOptions),
                        isPlaceholder: workType.isEmpty,
                        selection: $workType
                    ) {
                        Text(l("Select")).tag("")
                        ForEach(workTypeOptions, id: \.value) { item in
                            Text(item.label).tag(item.value)
                        }
                    }
                    .id(fieldAnchorId(for: "workType"))
                    errorText("workType")

                    IRefairField(l("Careers Portal URL")) {
                        IRefairTextField(l("https://company.com/careers"), text: $careersPortal)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .accessibilityLabel(l("Careers Portal URL"))
                    }
                    .id(fieldAnchorId(for: "careersPortal"))
                    errorText("careersPortal")
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
                        ForEach(Array(referrerConsentPoints.enumerated()), id: \.offset) { _, pointKey in
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
        .overlay {
            SubmissionSuccessPresentation(
                isPresented: $showSuccessModal,
                variant: successModalVariant
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
                Text(l("Send referrer details"))
            }
        }
        .frame(maxWidth: fillWidth ? .infinity : nil)
        .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: fillWidth))
        .disabled(isSubmitting || !networkMonitor.isConnected)
    }

    private var companyIndustryOptions: [(value: String, label: String)] {
        return companyIndustryValues.map { value in
            (value: value, label: l(value))
        }
    }

    private var workTypeOptions: [(value: String, label: String)] {
        let labels: [String: String] = [
            "On-site": l("On-site"),
            "Remote": l("Remote"),
            "Hybrid": l("Hybrid"),
        ]
        return workTypeValues.map { value in
            (value: value, label: labels[value] ?? value)
        }
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    private func fieldAnchorId(for key: String) -> String {
        "referrer-validation-field-\(key)"
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

    private func validate() -> Bool {
        var errors: [String: String] = [:]
        var firstErrorKey: String?

        func addError(_ key: String, _ message: String) {
            if firstErrorKey == nil {
                firstErrorKey = key
            }
            errors[key] = message
        }

        if fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            addError("name", l("Please enter your name."))
        }
        let emailValue = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if emailValue.isEmpty {
            addError("email", l("Please enter your work email."))
        } else if !Validator.isValidEmail(emailValue) {
            addError("email", l("Please enter a valid email address."))
        }
        if phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            addError("phone", l("Please enter your phone number."))
        }
        if country.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            addError("country", l("Please select your country of origin."))
        }
        let careersPortalValue = careersPortal.trimmingCharacters(in: .whitespacesAndNewlines)
        if careersPortalValue.isEmpty {
            addError("careersPortal", l("Please enter the careers portal URL."))
        } else if !isValidUrl(careersPortalValue) {
            addError("careersPortal", l("Please enter a valid URL (http/https)."))
        }
        if companyIndustry.isEmpty {
            addError("companyIndustry", l("Please select the company industry."))
        }
        if companyIndustry == "Other" && companyIndustryOther.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            addError("companyIndustryOther", l("Please specify the company industry."))
        }
        if workType.isEmpty {
            addError("workType", l("Please select a work type."))
        }
        if !Validator.isValidLinkedInProfile(linkedIn) {
            addError("linkedIn", l("Please enter a valid LinkedIn profile URL."))
        }
        if !consent {
            addError("consent", l("Consent is required."))
        }
        fieldErrors = errors
        scrollToFirstValidationError(firstErrorKey)
        return errors.isEmpty
    }

    private func resetForm() {
        fullName = ""
        email = ""
        phone = ""
        country = ""
        company = ""
        careersPortal = ""
        companyIndustry = ""
        companyIndustryOther = ""
        workType = ""
        linkedIn = ""
        consent = false
        fieldErrors = [:]
        errorMessage = nil
        statusMessage = nil
        showSuccessModal = false
        successModalVariant = .referrerNew
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
            let payload = [
                "name": fullName.trimmingCharacters(in: .whitespacesAndNewlines),
                "email": email.trimmingCharacters(in: .whitespacesAndNewlines),
                "phone": phone.trimmingCharacters(in: .whitespacesAndNewlines),
                "country": country.trimmingCharacters(in: .whitespacesAndNewlines),
                "company": company.trimmingCharacters(in: .whitespacesAndNewlines),
                "careersPortal": careersPortal.trimmingCharacters(in: .whitespacesAndNewlines),
                "companyIndustry": companyIndustry,
                "companyIndustryOther": companyIndustryOther.trimmingCharacters(in: .whitespacesAndNewlines),
                "workType": workType,
                "linkedin": linkedIn.trimmingCharacters(in: .whitespacesAndNewlines),
                "language": AppLocale.languageCode,
                "website": "",
            ]
            let response = try await APIClient.registerReferrer(baseURL: apiBaseURL, payload: payload)
            let isExistingReferrer = response.isExisting == true
            let addedCompany = response.newCompanyAdded == true
            statusMessage = isExistingReferrer
            ? l("We've received your submission. Our admin team will review any updates and be in touch.")
            : l("We've received your details. We'll reach out when there's an applicant match.")
            successModalVariant = addedCompany
            ? .referrerNewCompany
            : (isExistingReferrer ? .referrerExisting : .referrerNew)
            showSuccessModal = true
            Telemetry.track("referrer_register_success")
        } catch {
            Telemetry.capture(error)
            errorMessage = error.localizedDescription
        }
    }

    private func isValidUrl(_ value: String) -> Bool {
        guard let url = URL(string: value), let scheme = url.scheme?.lowercased() else { return false }
        return scheme == "http" || scheme == "https"
    }
}

#Preview {
    ReferrerRegistrationView()
        .environmentObject(NetworkMonitor())
}
