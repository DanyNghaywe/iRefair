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

struct ReferrerRegistrationResponse: APIResult {
    let ok: Bool
    let irref: String?
    let error: String?
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
    let error: String?
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
}

struct ReferrerApplicant: Identifiable, Decodable {
    var id: String { irain }
    let irain: String
    let firstName: String?
    let lastName: String?
    let email: String?
    let status: String?
    let phone: String?

    var displayName: String {
        let parts = [firstName, lastName].compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
        let name = parts.joined(separator: " ")
        return name.isEmpty ? irain : name
    }
}
