import SwiftUI
import UniformTypeIdentifiers

struct ApplicantView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "https://irefair.com"
    @AppStorage("submissionLanguage") private var submissionLanguage: String = "en"
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
                    Section {
                        Text(l("Create or update your iRefair applicant profile. All required fields are marked with *.",
                               "Créez ou mettez à jour votre profil candidat iRefair. Les champs obligatoires sont marqués d’un *."))
                            .font(Theme.font(.subheadline))
                            .foregroundStyle(Theme.muted)
                        if apiBaseURL.isEmpty {
                            Label(l("Set your API base URL in Settings before submitting.",
                                     "Définissez l’URL de base de l’API dans Paramètres avant d’envoyer."),
                                  systemImage: "exclamationmark.triangle")
                                .foregroundStyle(Theme.error)
                        } else {
                            Text("\(l("API", "API")): \(Validator.sanitizeBaseURL(apiBaseURL))")
                                .font(Theme.font(.caption))
                                .foregroundStyle(Theme.muted)
                        }
                    }

                    if !networkMonitor.isConnected {
                        IRefairSection {
                            StatusBanner(text: l("You're offline. Connect to the internet to submit the form.", "Vous êtes hors ligne. Connectez-vous à Internet pour soumettre le formulaire."), style: .warning)
                        }
                    }

                    IRefairSection(l("Submission language", "Langue de soumission")) {
                        IRefairField(l("Language", "Langue")) {
                            Picker(l("Language", "Langue"), selection: $submissionLanguage) {
                                Text(l("English", "Anglais")).tag("en")
                                Text(l("French", "Français")).tag("fr")
                            }
                            .pickerStyle(.segmented)
                        }
                    }

                    IRefairSection(l("Personal information", "Informations personnelles")) {
                        IRefairField(l("First name *", "Prénom *")) {
                            TextField("", text: $firstName)
                                .accessibilityLabel(l("First name *", "Prénom *"))
                        }
                        errorText("firstName")
                        IRefairField(l("Middle name", "Deuxième prénom")) {
                            TextField("", text: $middleName)
                                .accessibilityLabel(l("Middle name", "Deuxième prénom"))
                        }
                        IRefairField(l("Last name *", "Nom de famille *")) {
                            TextField("", text: $familyName)
                                .accessibilityLabel(l("Last name *", "Nom de famille *"))
                        }
                        errorText("familyName")
                        IRefairField(l("Email *", "Adresse e-mail *")) {
                            TextField("", text: $email)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .accessibilityLabel(l("Email *", "Adresse e-mail *"))
                        }
                        errorText("email")
                        IRefairField(l("Phone *", "Téléphone *")) {
                            TextField("", text: $phone)
                                .keyboardType(.phonePad)
                                .accessibilityLabel(l("Phone *", "Téléphone *"))
                        }
                        errorText("phone")
                        IRefairMenuPicker(
                            l("Country of origin *", "Pays d'origine *"),
                            displayValue: countryOfOrigin.isEmpty ? l("Select", "Sélectionner") : countryOfOrigin,
                            isPlaceholder: countryOfOrigin.isEmpty,
                            selection: $countryOfOrigin
                        ) {
                            Text(l("Select", "Sélectionner")).tag("")
                            ForEach(CountryData.all, id: \.self) { country in
                                Text(country).tag(country)
                            }
                        }
                        errorText("countryOfOrigin")
                    }

                    IRefairSection(l("Languages", "Langues")) {
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
                            IRefairField(l("Other languages *", "Autres langues *")) {
                                TextField("", text: $languagesOther)
                                    .accessibilityLabel(l("Other languages *", "Autres langues *"))
                            }
                            errorText("languagesOther")
                        }
                    }

                    IRefairSection(l("Location and authorization", "Lieu et autorisation")) {
                        IRefairMenuPicker(
                            l("Located in Canada? *", "Êtes-vous au Canada ? *"),
                            displayValue: pickerDisplayValue(locatedCanada, options: yesNoOptions),
                            isPlaceholder: locatedCanada.isEmpty,
                            selection: $locatedCanada
                        ) {
                            Text(l("Select", "Sélectionner")).tag("")
                            ForEach(yesNoOptions, id: \.value) { option in
                                Text(option.label).tag(option.value)
                            }
                        }
                        errorText("locatedCanada")

                        if locatedCanada == "Yes" {
                            IRefairMenuPicker(
                                l("Province *", "Province *"),
                                displayValue: province.isEmpty ? l("Select", "Sélectionner") : province,
                                isPlaceholder: province.isEmpty,
                                selection: $province
                            ) {
                                Text(l("Select", "Sélectionner")).tag("")
                                ForEach(provinces, id: \.self) { item in
                                    Text(item).tag(item)
                                }
                            }
                            errorText("province")

                            IRefairMenuPicker(
                                l("Authorized to work in Canada? *", "Autorisé(e) à travailler au Canada ? *"),
                                displayValue: pickerDisplayValue(authorizedCanada, options: yesNoOptions),
                                isPlaceholder: authorizedCanada.isEmpty,
                                selection: $authorizedCanada
                            ) {
                                Text(l("Select", "Sélectionner")).tag("")
                                ForEach(yesNoOptions, id: \.value) { option in
                                    Text(option.label).tag(option.value)
                                }
                            }
                            errorText("authorizedCanada")
                        }

                        if locatedCanada == "No" {
                            IRefairMenuPicker(
                                l("Eligible to move to Canada? *", "Êtes-vous prêt(e) à déménager au Canada ? *"),
                                displayValue: pickerDisplayValue(eligibleMoveCanada, options: yesNoOptions),
                                isPlaceholder: eligibleMoveCanada.isEmpty,
                                selection: $eligibleMoveCanada
                            ) {
                                Text(l("Select", "Sélectionner")).tag("")
                                ForEach(yesNoOptions, id: \.value) { option in
                                    Text(option.label).tag(option.value)
                                }
                            }
                            errorText("eligibleMoveCanada")
                        }
                    }

                    IRefairSection(l("Professional profile", "Profil professionnel")) {
                        IRefairMenuPicker(
                            l("Industry *", "Secteur *"),
                            displayValue: pickerDisplayValue(industryType, options: industryOptions),
                            isPlaceholder: industryType.isEmpty,
                            selection: $industryType
                        ) {
                            Text(l("Select", "Sélectionner")).tag("")
                            ForEach(industryOptions, id: \.value) { item in
                                Text(item.label).tag(item.value)
                            }
                        }
                        errorText("industryType")
                        if industryType == "Other" {
                            IRefairField(l("Industry details *", "Précisez le secteur *")) {
                                TextField("", text: $industryOther)
                                    .accessibilityLabel(l("Industry details *", "Précisez le secteur *"))
                            }
                            errorText("industryOther")
                        }
                        IRefairMenuPicker(
                            l("Currently employed? *", "Actuellement employé(e) ? *"),
                            displayValue: pickerDisplayValue(employmentStatus, options: employmentOptions),
                            isPlaceholder: employmentStatus.isEmpty,
                            selection: $employmentStatus
                        ) {
                            Text(l("Select", "Sélectionner")).tag("")
                            ForEach(employmentOptions, id: \.value) { item in
                                Text(item.label).tag(item.value)
                            }
                        }
                        errorText("employmentStatus")
                        IRefairField(l("LinkedIn profile", "Profil LinkedIn")) {
                            TextField("", text: $linkedin)
                                .keyboardType(.URL)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .accessibilityLabel(l("LinkedIn profile", "Profil LinkedIn"))
                        }
                        errorText("linkedin")
                    }

                    IRefairSection(l("Resume", "CV")) {
                        IRefairField(l("Resume", "CV")) {
                            HStack {
                                Text(resumeName.isEmpty ? l("No file selected", "Aucun fichier sélectionné") : resumeName)
                                    .font(Theme.font(.subheadline))
                                    .foregroundStyle(resumeName.isEmpty ? Theme.muted : Theme.ink)
                                Spacer()
                                Button(l("Choose file", "Choisir un fichier")) {
                                    showDocumentPicker = true
                                }
                                .buttonStyle(IRefairGhostButtonStyle())
                            }
                            .accessibilityLabel(l("Resume file", "Fichier CV"))
                            .irefairInput()
                        }
                        errorText("resume")
                        if let resumeFile, resumeFile.data.count > FileSupport.maxResumeSize {
                            Text(l("Resume must be under 10 MB.", "Le CV doit faire moins de 10 Mo."))
                                .foregroundStyle(Theme.error)
                                .font(Theme.font(.caption))
                        }
                    }

                    IRefairSection(l("Consent", "Consentement")) {
                        Toggle(l("I agree to be contacted by iRefair.", "J’accepte d’être contacté(e) par iRefair."), isOn: $consent)
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
                                Text(l("Submit Applicant Profile", "Soumettre le profil candidat"))
                            }
                        }
                        .buttonStyle(IRefairPrimaryButtonStyle())
                        .disabled(isSubmitting || !networkMonitor.isConnected)
                    }
                }
            }
            .navigationTitle(l("Applicant", "Candidat"))
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

    private func l(_ en: String, _ fr: String) -> String {
        Localizer.text(en, fr, language: submissionLanguage)
    }

    private func pickerDisplayValue(_ value: String, options: [(value: String, label: String)]) -> String {
        guard !value.isEmpty else { return l("Select", "Sélectionner") }
        return options.first(where: { $0.value == value })?.label ?? value
    }

    private var yesNoOptions: [(value: String, label: String)] {
        [
            (value: "Yes", label: l("Yes", "Oui")),
            (value: "No", label: l("No", "Non")),
        ]
    }

    private var languageOptions: [(value: String, label: String)] {
        let labels: [String: String] = [
            "English": l("English", "Anglais"),
            "Arabic": l("Arabic", "Arabe"),
            "French": l("French", "Français"),
            "Other": l("Other", "Autre"),
        ]
        return languageValues.map { value in
            (value: value, label: labels[value] ?? value)
        }
    }

    private var employmentOptions: [(value: String, label: String)] {
        let labels: [String: String] = [
            "Yes": l("Yes", "Oui"),
            "No": l("No", "Non"),
            "Temporary Work": l("Temporary Work", "Travail temporaire"),
        ]
        return employmentValues.map { value in
            (value: value, label: labels[value] ?? value)
        }
    }

    private var industryOptions: [(value: String, label: String)] {
        if submissionLanguage.lowercased() != "fr" {
            return industryValues.map { ($0, $0) }
        }
        let labels: [String: String] = [
            "Information Technology (IT)": "Technologies de l'information (TI)",
            "Finance / Banking / Accounting": "Finance / Banque / Comptabilité",
            "Healthcare / Medical": "Santé / Médical",
            "Education / Academia": "Éducation / Université",
            "Engineering / Construction": "Ingénierie / Construction",
            "Marketing / Advertising / PR": "Marketing / Publicité / RP",
            "Media / Entertainment / Journalism": "Médias / Divertissement / Journalisme",
            "Legal / Law": "Juridique / Droit",
            "Human Resources / Recruitment": "Ressources humaines / Recrutement",
            "Retail / E-commerce": "Commerce de détail / E-commerce",
            "Hospitality / Travel / Tourism": "Hôtellerie / Voyage / Tourisme",
            "Logistics / Transportation": "Logistique / Transport",
            "Manufacturing": "Fabrication",
            "Non-Profit / NGO": "Organisme à but non lucratif / ONG",
            "Real Estate": "Immobilier",
            "Energy / Utilities": "Énergie / Services publics",
            "Telecommunications": "Télécommunications",
            "Agriculture / Food Industry": "Agriculture / Agroalimentaire",
            "Compliance/ Audit/ Monitoring & Evaluation": "Conformité / Audit / Suivi & Évaluation",
            "Other": "Autre",
        ]
        return industryValues.map { value in
            (value: value, label: labels[value] ?? value)
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
                let message = l("Resume must be a PDF, DOC, or DOCX file.", "Le CV doit être un fichier PDF, DOC ou DOCX.")
                fieldErrors["resume"] = message
                errorMessage = message
                return
            }
            let data = try FileReader.loadData(from: url)
            guard data.count <= FileSupport.maxResumeSize else {
                let message = l("Resume must be under 10 MB.", "Le CV doit faire moins de 10 Mo.")
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
            errorMessage = l("Unable to load the selected file.", "Impossible de charger le fichier sélectionné.")
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
            errorMessage = l("Set your API base URL in Settings first.", "Définissez d'abord l'URL de base de l'API dans Paramètres.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.", "Vous êtes hors ligne. Connectez-vous à Internet et réessayez.")
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
                errorMessage = l("Unable to load your details.", "Impossible de charger vos informations.")
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
            statusMessage = l("Details loaded. Update your information and submit.", "Informations chargées. Mettez à jour vos informations et soumettez.")
            Telemetry.track("applicant_prefill_loaded", properties: ["purpose": updatePurpose])
        } catch {
            Telemetry.capture(error)
            errorMessage = error.localizedDescription
        }
    }

    private func validate() -> Bool {
        var errors: [String: String] = [:]
        if firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["firstName"] = l("First name is required.", "Le prénom est requis.")
        }
        if familyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["familyName"] = l("Last name is required.", "Le nom de famille est requis.")
        }
        if !Validator.isValidEmail(email) {
            errors["email"] = l("Enter a valid email.", "Veuillez entrer un e-mail valide.")
        }
        if phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["phone"] = l("Phone number is required.", "Le numéro de téléphone est requis.")
        }
        if countryOfOrigin.isEmpty {
            errors["countryOfOrigin"] = l("Select a country.", "Sélectionnez un pays.")
        }
        if languages.isEmpty {
            errors["languages"] = l("Select at least one language.", "Sélectionnez au moins une langue.")
        }
        if languages.contains("Other") && languagesOther.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["languagesOther"] = l("Specify other languages.", "Précisez les autres langues.")
        }
        if locatedCanada.isEmpty {
            errors["locatedCanada"] = l("Select an option.", "Sélectionnez une option.")
        }
        if locatedCanada == "Yes" {
            if province.isEmpty {
                errors["province"] = l("Select a province.", "Sélectionnez une province.")
            }
            if authorizedCanada.isEmpty {
                errors["authorizedCanada"] = l("Select an option.", "Sélectionnez une option.")
            }
        }
        if locatedCanada == "No" && eligibleMoveCanada.isEmpty {
            errors["eligibleMoveCanada"] = l("Select an option.", "Sélectionnez une option.")
        }
        if industryType.isEmpty {
            errors["industryType"] = l("Select an industry.", "Sélectionnez un secteur.")
        }
        if industryType == "Other" && industryOther.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["industryOther"] = l("Provide industry details.", "Précisez le secteur.")
        }
        if employmentStatus.isEmpty {
            errors["employmentStatus"] = l("Select an option.", "Sélectionnez une option.")
        }
        if !Validator.isValidLinkedInProfile(linkedin) {
            errors["linkedin"] = l("Enter a valid LinkedIn profile URL.", "Entrez une URL LinkedIn valide.")
        }
        if requiresResume && resumeFile == nil {
            errors["resume"] = l("Resume is required.", "Le CV est requis.")
        }
        if !consent {
            errors["consent"] = l("Consent is required.", "Le consentement est requis.")
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
            "language": submissionLanguage,
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
            errorMessage = l("Set your API base URL in Settings first.", "Définissez d'abord l'URL de base de l'API dans Paramètres.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.", "Vous êtes hors ligne. Connectez-vous à Internet et réessayez.")
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
            statusMessage = response.message ?? l("Application submitted. Please check your email to confirm registration.", "Candidature envoyée. Veuillez vérifier votre e-mail pour confirmer l'inscription.")
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
