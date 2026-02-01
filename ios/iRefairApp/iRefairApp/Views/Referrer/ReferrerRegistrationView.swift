import SwiftUI

struct ReferrerRegistrationView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "https://irefair.com"
    @AppStorage("submissionLanguage") private var submissionLanguage: String = "en"

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

    var body: some View {
        IRefairForm {
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

            IRefairSection(l("Become a referrer", "Devenir référent")) {
                IRefairField(l("Full name *", "Nom complet *")) {
                    TextField("", text: $fullName)
                        .accessibilityLabel(l("Full name *", "Nom complet *"))
                }
                errorText("name")
                IRefairField(l("Work email *", "E-mail professionnel *")) {
                    TextField("", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .accessibilityLabel(l("Work email *", "E-mail professionnel *"))
                }
                errorText("email")
                IRefairField(l("Phone", "Téléphone")) {
                    TextField("", text: $phone)
                        .accessibilityLabel(l("Phone", "Téléphone"))
                }
                errorText("phone")
                IRefairField(l("Country", "Pays")) {
                    TextField("", text: $country)
                        .accessibilityLabel(l("Country", "Pays"))
                }
                errorText("country")
                IRefairField(l("Company name", "Nom de l’entreprise")) {
                    TextField("", text: $company)
                        .accessibilityLabel(l("Company name", "Nom de l’entreprise"))
                }
                IRefairField(l("Careers portal URL", "URL du portail carrières")) {
                    TextField("", text: $careersPortal)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .accessibilityLabel(l("Careers portal URL", "URL du portail carrières"))
                }
                errorText("careersPortal")
                IRefairMenuPicker(
                    l("Company industry", "Secteur de l’entreprise"),
                    displayValue: pickerDisplayValue(companyIndustry, options: companyIndustryOptions),
                    isPlaceholder: companyIndustry.isEmpty,
                    selection: $companyIndustry
                ) {
                    Text(l("Select", "Sélectionner")).tag("")
                    ForEach(companyIndustryOptions, id: \.value) { item in
                        Text(item.label).tag(item.value)
                    }
                }
                errorText("companyIndustry")
                if companyIndustry == "Other" {
                    IRefairField(l("Other industry", "Autre secteur")) {
                        TextField("", text: $companyIndustryOther)
                            .accessibilityLabel(l("Other industry", "Autre secteur"))
                    }
                    errorText("companyIndustryOther")
                }
                IRefairMenuPicker(
                    l("Work type", "Type de travail"),
                    displayValue: pickerDisplayValue(workType, options: workTypeOptions),
                    isPlaceholder: workType.isEmpty,
                    selection: $workType
                ) {
                    Text(l("Select", "Sélectionner")).tag("")
                    ForEach(workTypeOptions, id: \.value) { item in
                        Text(item.label).tag(item.value)
                    }
                }
                errorText("workType")
                IRefairField(l("LinkedIn profile", "Profil LinkedIn")) {
                    TextField("", text: $linkedIn)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .accessibilityLabel(l("LinkedIn profile", "Profil LinkedIn"))
                }
                errorText("linkedIn")
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
                        Text(l("Register as Referrer", "S'inscrire comme référent"))
                    }
                }
                .buttonStyle(IRefairPrimaryButtonStyle())
                .disabled(isSubmitting || !networkMonitor.isConnected)
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

    private var companyIndustryOptions: [(value: String, label: String)] {
        if submissionLanguage.lowercased() != "fr" {
            return companyIndustryValues.map { ($0, $0) }
        }
        let labels: [String: String] = [
            "Technology": "Technologie",
            "Finance": "Finance",
            "Healthcare": "Santé",
            "Education": "Éducation",
            "Retail": "Commerce de détail",
            "Hospitality": "Hôtellerie",
            "Marketing / Media": "Marketing / Médias",
            "Engineering / Construction": "Ingénierie / Construction",
            "Consulting": "Conseil",
            "Not for profit": "Organisme à but non lucratif",
            "Compliance / Audit": "Conformité / Audit",
            "Other": "Autre",
        ]
        return companyIndustryValues.map { value in
            (value: value, label: labels[value] ?? value)
        }
    }

    private var workTypeOptions: [(value: String, label: String)] {
        let labels: [String: String] = [
            "On-site": l("On-site", "Sur site"),
            "Remote": l("Remote", "Télétravail"),
            "Hybrid": l("Hybrid", "Hybride"),
        ]
        return workTypeValues.map { value in
            (value: value, label: labels[value] ?? value)
        }
    }

    private func l(_ en: String, _ fr: String) -> String {
        Localizer.text(en, fr, language: submissionLanguage)
    }

    private func pickerDisplayValue(_ value: String, options: [(value: String, label: String)]) -> String {
        guard !value.isEmpty else { return l("Select", "Sélectionner") }
        return options.first(where: { $0.value == value })?.label ?? value
    }

    private func validate() -> Bool {
        var errors: [String: String] = [:]
        if fullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["name"] = l("Full name is required.", "Le nom complet est requis.")
        }
        if !Validator.isValidEmail(email) {
            errors["email"] = l("Enter a valid email.", "Veuillez entrer un e-mail valide.")
        }
        if phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["phone"] = l("Phone number is required.", "Le numéro de téléphone est requis.")
        }
        if country.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["country"] = l("Country is required.", "Le pays est requis.")
        }
        if companyIndustry.isEmpty {
            errors["companyIndustry"] = l("Select an industry.", "Sélectionnez un secteur.")
        }
        if companyIndustry == "Other" && companyIndustryOther.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["companyIndustryOther"] = l("Specify the industry.", "Précisez le secteur.")
        }
        if workType.isEmpty {
            errors["workType"] = l("Select a work type.", "Sélectionnez un type de travail.")
        }
        let careersPortalValue = careersPortal.trimmingCharacters(in: .whitespacesAndNewlines)
        if careersPortalValue.isEmpty {
            errors["careersPortal"] = l("Careers portal URL is required.", "L'URL du portail carrières est requise.")
        } else if !isValidUrl(careersPortalValue) {
            errors["careersPortal"] = l("Enter a valid careers portal URL.", "Entrez une URL valide du portail carrières.")
        }
        if !Validator.isValidLinkedInProfile(linkedIn) {
            errors["linkedIn"] = l("Enter a valid LinkedIn profile URL.", "Entrez une URL LinkedIn valide.")
        }
        if !consent {
            errors["consent"] = l("Consent is required.", "Le consentement est requis.")
        }
        fieldErrors = errors
        return errors.isEmpty
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
                "language": submissionLanguage,
                "website": "",
            ]
            let response = try await APIClient.registerReferrer(baseURL: apiBaseURL, payload: payload)
            statusMessage = response.irref != nil
            ? l("Referrer registered. Your ID: \(response.irref ?? "")", "Référent enregistré. Votre ID : \(response.irref ?? "")")
            : l("Referrer registered.", "Référent enregistré.")
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
