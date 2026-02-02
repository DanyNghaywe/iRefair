import SwiftUI
import UniformTypeIdentifiers

struct ApplicantView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "https://irefair.com"
    @AppStorage("applicantUpdateToken") private var storedUpdateToken: String = ""
    @AppStorage("applicantUpdateAppId") private var storedUpdateAppId: String = ""

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

    var body: some View {
        NavigationStack {
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
                            TextField("", text: $firstName)
                                .accessibilityLabel(l("First name *"))
                        }
                        errorText("firstName")
                        IRefairField(l("Middle name")) {
                            TextField("", text: $middleName)
                                .accessibilityLabel(l("Middle name"))
                        }
                        IRefairField(l("Last name *")) {
                            TextField("", text: $familyName)
                                .accessibilityLabel(l("Last name *"))
                        }
                        errorText("familyName")
                        IRefairField(l("Email *")) {
                            TextField("", text: $email)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .accessibilityLabel(l("Email *"))
                        }
                        errorText("email")
                        IRefairField(l("Phone *")) {
                            TextField("", text: $phone)
                                .keyboardType(.phonePad)
                                .accessibilityLabel(l("Phone *"))
                        }
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
                        errorText("countryOfOrigin")
                    }

                    IRefairSection(l("Languages")) {
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
                        errorText("languages")
                        if languages.contains("Other") {
                            IRefairField(l("Other languages *")) {
                                TextField("", text: $languagesOther)
                                    .accessibilityLabel(l("Other languages *"))
                            }
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
                        errorText("locatedCanada")

                        if locatedCanada == "Yes" {
                            IRefairMenuPicker(
                                l("Province *"),
                                displayValue: province.isEmpty ? l("Select") : province,
                                isPlaceholder: province.isEmpty,
                                selection: $province
                            ) {
                                Text(l("Select")).tag("")
                                ForEach(provinces, id: \.self) { item in
                                    Text(item).tag(item)
                                }
                            }
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
                        errorText("industryType")
                        if industryType == "Other" {
                            IRefairField(l("Industry details *")) {
                                TextField("", text: $industryOther)
                                    .accessibilityLabel(l("Industry details *"))
                            }
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
                        errorText("employmentStatus")
                        IRefairField(l("LinkedIn profile")) {
                            TextField("", text: $linkedin)
                                .keyboardType(.URL)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .accessibilityLabel(l("LinkedIn profile"))
                        }
                        errorText("linkedin")
                    }

                    IRefairSection(l("Resume")) {
                        IRefairField(l("Resume")) {
                            HStack {
                                Text(resumeName.isEmpty ? l("No file selected") : resumeName)
                                    .font(Theme.font(.subheadline))
                                    .foregroundStyle(resumeName.isEmpty ? Theme.muted : Theme.ink)
                                Spacer()
                                Button(l("Choose file")) {
                                    showDocumentPicker = true
                                }
                                .buttonStyle(IRefairGhostButtonStyle())
                            }
                            .accessibilityLabel(l("Resume file"))
                            .irefairInput()
                        }
                        errorText("resume")
                        if let resumeFile, resumeFile.data.count > FileSupport.maxResumeSize {
                            Text(l("Resume must be under 10 MB."))
                                .foregroundStyle(Theme.error)
                                .font(Theme.font(.caption))
                        }
                    }

                    IRefairSection(l("Consent")) {
                        Toggle(l("I agree to be contacted by iRefair."), isOn: $consent)
                            .toggleStyle(IRefairCheckboxToggleStyle())
                        errorText("consent")
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

                    IRefairSection {
                        Button {
                            Task { await submit() }
                        } label: {
                            if isSubmitting {
                                ProgressView()
                            } else {
                                Text(l("Submit Applicant Profile"))
                            }
                        }
                        .buttonStyle(IRefairPrimaryButtonStyle())
                        .disabled(isSubmitting || !networkMonitor.isConnected)
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

    private func errorText(_ key: String) -> some View {
        Group {
            if let message = fieldErrors[key] {
                Text(message).foregroundStyle(Theme.error).font(Theme.font(.caption))
            }
        }
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    private func pickerDisplayValue(_ value: String, options: [(value: String, label: String)]) -> String {
        guard !value.isEmpty else { return l("Select") }
        return options.first(where: { $0.value == value })?.label ?? value
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
                let message = l("Resume must be a PDF, DOC, or DOCX file.")
                fieldErrors["resume"] = message
                errorMessage = message
                return
            }
            let data = try FileReader.loadData(from: url)
            guard data.count <= FileSupport.maxResumeSize else {
                let message = l("Resume must be under 10 MB.")
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
            errorMessage = l("Set your API base URL in Settings first.")
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
        if firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["firstName"] = l("First name is required.")
        }
        if familyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["familyName"] = l("Last name is required.")
        }
        if !Validator.isValidEmail(email) {
            errors["email"] = l("Enter a valid email.")
        }
        if phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["phone"] = l("Phone number is required.")
        }
        if countryOfOrigin.isEmpty {
            errors["countryOfOrigin"] = l("Select a country.")
        }
        if languages.isEmpty {
            errors["languages"] = l("Select at least one language.")
        }
        if languages.contains("Other") && languagesOther.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["languagesOther"] = l("Specify other languages.")
        }
        if locatedCanada.isEmpty {
            errors["locatedCanada"] = l("Select an option.")
        }
        if locatedCanada == "Yes" {
            if province.isEmpty {
                errors["province"] = l("Select a province.")
            }
            if authorizedCanada.isEmpty {
                errors["authorizedCanada"] = l("Select an option.")
            }
        }
        if locatedCanada == "No" && eligibleMoveCanada.isEmpty {
            errors["eligibleMoveCanada"] = l("Select an option.")
        }
        if industryType.isEmpty {
            errors["industryType"] = l("Select an industry.")
        }
        if industryType == "Other" && industryOther.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["industryOther"] = l("Provide industry details.")
        }
        if employmentStatus.isEmpty {
            errors["employmentStatus"] = l("Select an option.")
        }
        if !Validator.isValidLinkedInProfile(linkedin) {
            errors["linkedin"] = l("Enter a valid LinkedIn profile URL.")
        }
        if requiresResume && resumeFile == nil {
            errors["resume"] = l("Resume is required.")
        }
        if !consent {
            errors["consent"] = l("Consent is required.")
        }

        fieldErrors = errors
        return errors.isEmpty
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
            errorMessage = l("Set your API base URL in Settings first.")
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
            statusMessage = response.message ?? l("Application submitted. Please check your email to confirm registration.")
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
