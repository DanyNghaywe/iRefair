import Foundation

struct APIError: Error, LocalizedError {
    let message: String

    var errorDescription: String? {
        message
    }
}

protocol APIResult: Decodable {
    var ok: Bool { get }
    var error: String? { get }
}

extension APIResult {
    func validated() throws -> Self {
        guard ok else {
            throw APIError(message: error ?? "Request failed.")
        }
        return self
    }
}

struct ApplicantResponse: APIResult {
    let ok: Bool
    let confirmationPending: Bool?
    let confirmationEmailStatus: String?
    let message: String?
    let error: String?
}

struct ApplyResponse: APIResult {
    let ok: Bool
    let applicationId: String?
    let message: String?
    let error: String?
}

struct HiringCompaniesResponse: APIResult {
    let ok: Bool
    let companies: [HiringCompany]?
    let error: String?
}

struct HiringCompany: Identifiable, Decodable {
    var id: String { code }
    let code: String
    let name: String
    let industry: String
    let careersUrl: String?
}

struct ReferrerRegistrationResponse: APIResult {
    let ok: Bool
    let iRref: String?
    let isExisting: Bool?
    let newCompanyAdded: Bool?
    let error: String?

    private enum CodingKeys: String, CodingKey {
        case ok
        case iRref
        case irref
        case isExisting
        case newCompanyAdded
        case error
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        ok = try container.decode(Bool.self, forKey: .ok)
        let primaryIRref = try container.decodeIfPresent(String.self, forKey: .iRref)
        let fallbackIRref = try container.decodeIfPresent(String.self, forKey: .irref)
        iRref = primaryIRref ?? fallbackIRref
        isExisting = try container.decodeIfPresent(Bool.self, forKey: .isExisting)
        newCompanyAdded = try container.decodeIfPresent(Bool.self, forKey: .newCompanyAdded)
        error = try container.decodeIfPresent(String.self, forKey: .error)
    }
}

struct ReferrerPortalLinkResponse: APIResult {
    let ok: Bool
    let message: String?
    let error: String?
}

struct ReferrerPortalDataResponse: APIResult {
    let ok: Bool
    let referrer: ReferrerSummary?
    let applicants: [ReferrerApplicant]?
    let companies: [ReferrerCompany]?
    let error: String?

    private enum CodingKeys: String, CodingKey {
        case ok
        case referrer
        case applicants
        case items
        case companies
        case error
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        ok = try container.decode(Bool.self, forKey: .ok)
        referrer = try container.decodeIfPresent(ReferrerSummary.self, forKey: .referrer)
        if let applicants = try container.decodeIfPresent([ReferrerApplicant].self, forKey: .applicants) {
            self.applicants = applicants
        } else {
            self.applicants = try container.decodeIfPresent([ReferrerApplicant].self, forKey: .items)
        }
        companies = try container.decodeIfPresent([ReferrerCompany].self, forKey: .companies)
        error = try container.decodeIfPresent(String.self, forKey: .error)
    }
}

struct ReferrerFeedbackResponse: APIResult {
    let ok: Bool
    let message: String?
    let error: String?
}

struct ApplicantPrefillResponse: APIResult {
    let ok: Bool
    let updatePurpose: String?
    let data: ApplicantPrefillData?
    let error: String?
}

struct ApplicantPrefillData: Decodable {
    let firstName: String
    let middleName: String
    let familyName: String
    let email: String
    let phone: String
    let locatedCanada: String
    let province: String
    let authorizedCanada: String
    let eligibleMoveCanada: String
    let countryOfOrigin: String
    let languages: String
    let languagesOther: String
    let industryType: String
    let industryOther: String
    let employmentStatus: String
    let linkedin: String
    let resumeFileName: String
    let desiredRole: String
    let targetCompanies: String
    let hasPostings: String
    let postingNotes: String
    let pitch: String
}

struct ReferrerSummary: Decodable {
    let irref: String
    let firstName: String
    let lastName: String
    let email: String
    let company: String?

    var displayName: String {
        let name = [firstName, lastName]
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        return name.isEmpty ? irref : name
    }

    private enum CodingKeys: String, CodingKey {
        case irref
        case firstName
        case lastName
        case name
        case email
        case company
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        irref = try container.decode(String.self, forKey: .irref)
        email = try container.decodeIfPresent(String.self, forKey: .email) ?? ""
        company = try container.decodeIfPresent(String.self, forKey: .company)

        let decodedFirst = (try container.decodeIfPresent(String.self, forKey: .firstName) ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let decodedLast = (try container.decodeIfPresent(String.self, forKey: .lastName) ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let fullName = (try container.decodeIfPresent(String.self, forKey: .name) ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        if !decodedFirst.isEmpty || !decodedLast.isEmpty {
            firstName = decodedFirst
            lastName = decodedLast
        } else if !fullName.isEmpty {
            firstName = fullName
            lastName = ""
        } else {
            firstName = ""
            lastName = ""
        }
    }
}

struct ReferrerApplicant: Identifiable, Decodable {
    let id: String
    let irain: String
    let applicationId: String?
    let firstName: String?
    let lastName: String?
    let applicantName: String?
    let email: String?
    let status: String?
    let phone: String?

    var displayName: String {
        if let applicantName, !applicantName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return applicantName
        }
        let parts = [firstName, lastName].compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
        let name = parts.joined(separator: " ")
        let fallback = irain.isEmpty ? id : irain
        return name.isEmpty ? fallback : name
    }

    private enum CodingKeys: String, CodingKey {
        case id
        case applicationId
        case irain
        case applicantId
        case firstName
        case lastName
        case applicantName
        case email
        case applicantEmail
        case status
        case phone
        case applicantPhone
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        let primaryApplicationId = try container.decodeIfPresent(String.self, forKey: .applicationId)
        let fallbackApplicationId = try container.decodeIfPresent(String.self, forKey: .id)
        let decodedApplicationId = primaryApplicationId ?? fallbackApplicationId

        let primaryApplicantId = try container.decodeIfPresent(String.self, forKey: .irain)
        let fallbackApplicantId = try container.decodeIfPresent(String.self, forKey: .applicantId)
        let decodedApplicantId = primaryApplicantId ?? fallbackApplicantId

        applicationId = decodedApplicationId
        irain = decodedApplicantId ?? ""
        id = decodedApplicationId ?? decodedApplicantId ?? ""

        firstName = try container.decodeIfPresent(String.self, forKey: .firstName)
        lastName = try container.decodeIfPresent(String.self, forKey: .lastName)
        applicantName = try container.decodeIfPresent(String.self, forKey: .applicantName)
        let primaryEmail = try container.decodeIfPresent(String.self, forKey: .email)
        let fallbackEmail = try container.decodeIfPresent(String.self, forKey: .applicantEmail)
        email = primaryEmail ?? fallbackEmail
        status = try container.decodeIfPresent(String.self, forKey: .status)
        let primaryPhone = try container.decodeIfPresent(String.self, forKey: .phone)
        let fallbackPhone = try container.decodeIfPresent(String.self, forKey: .applicantPhone)
        phone = primaryPhone ?? fallbackPhone
    }
}

struct ReferrerCompany: Identifiable, Decodable {
    let id: String
    let name: String
    let ircrn: String
}
