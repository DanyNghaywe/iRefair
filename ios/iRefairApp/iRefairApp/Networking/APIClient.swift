import Foundation

enum APIClient {
    static func submitApplicant(baseURL: String, payload: [String: String], resume: UploadFile?) async throws -> ApplicantResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/applicant")
        var builder = MultipartFormDataBuilder()
        payload.forEach { key, value in
            builder.addField(name: key, value: value)
        }
        if let resume {
            builder.addFile(resume)
        }
        let (body, boundary) = builder.finalize()
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        return try await send(request)
    }

    static func submitApplication(baseURL: String, payload: [String: String], resume: UploadFile) async throws -> ApplyResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/apply")
        var builder = MultipartFormDataBuilder()
        payload.forEach { key, value in
            builder.addField(name: key, value: value)
        }
        builder.addFile(resume)
        let (body, boundary) = builder.finalize()
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        return try await send(request)
    }

    static func registerReferrer(baseURL: String, payload: [String: String]) async throws -> ReferrerRegistrationResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/referrer")
        return try await sendJSON(url: url, payload: payload)
    }

    static func requestReferrerLink(baseURL: String, email: String) async throws -> ReferrerPortalLinkResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/referrer/portal/request-link")
        return try await sendJSON(url: url, payload: ["email": email])
    }

    static func exchangeReferrerMobileSession(
        baseURL: String,
        portalToken: String
    ) async throws -> ReferrerMobileAuthExchangeResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/referrer/mobile/auth/exchange")
        let trimmedPortalToken = portalToken.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedPortalToken.isEmpty {
            throw APIError(message: "Missing portal token.")
        }
        return try await sendJSON(url: url, payload: ["portalToken": trimmedPortalToken])
    }

    static func exchangeApplicantMobileSession(
        baseURL: String,
        applicantId: String,
        applicantKey: String
    ) async throws -> ApplicantMobileAuthExchangeResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/applicant/mobile/auth/exchange")
        let trimmedApplicantId = applicantId.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedApplicantKey = applicantKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmedApplicantId.isEmpty || trimmedApplicantKey.isEmpty {
            throw APIError(message: "Missing applicant credentials.")
        }
        return try await sendJSON(
            url: url,
            payload: [
                "applicantId": trimmedApplicantId,
                "applicantKey": trimmedApplicantKey,
            ]
        )
    }

    static func refreshReferrerMobileSession(baseURL: String, refreshToken: String) async throws -> ReferrerMobileAuthRefreshResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/referrer/mobile/auth/refresh")
        return try await sendJSON(url: url, payload: ["refreshToken": refreshToken])
    }

    static func refreshApplicantMobileSession(baseURL: String, refreshToken: String) async throws -> ApplicantMobileAuthRefreshResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/applicant/mobile/auth/refresh")
        return try await sendJSON(url: url, payload: ["refreshToken": refreshToken])
    }

    static func logoutReferrerMobileSession(baseURL: String, refreshToken: String) async throws -> ReferrerMobileAuthLogoutResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/referrer/mobile/auth/logout")
        return try await sendJSON(url: url, payload: ["refreshToken": refreshToken])
    }

    static func logoutApplicantMobileSession(baseURL: String, refreshToken: String) async throws -> ApplicantMobileAuthLogoutResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/applicant/mobile/auth/logout")
        return try await sendJSON(url: url, payload: ["refreshToken": refreshToken])
    }

    static func loadReferrerPortal(baseURL: String, token: String) async throws -> ReferrerPortalDataResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/referrer/portal/data")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return try await sendWithRetry(request, retries: 2)
    }

    static func loadApplicantPortal(baseURL: String, token: String) async throws -> ApplicantPortalDataResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/applicant/mobile/portal/data")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return try await sendWithRetry(request, retries: 2)
    }

    static func loadHiringCompanies(baseURL: String) async throws -> HiringCompaniesResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/hiring-companies")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        return try await sendWithRetry(request, retries: 2)
    }

    static func loadApplicantPrefill(baseURL: String, updateToken: String, appId: String) async throws -> ApplicantPrefillResponse {
        guard var components = URLComponents(url: try makeURL(baseURL: baseURL, path: "/api/applicant/data"), resolvingAgainstBaseURL: false) else {
            throw APIError(message: "Invalid API base URL.")
        }
        components.queryItems = [
            URLQueryItem(name: "updateToken", value: updateToken),
            URLQueryItem(name: "appId", value: appId),
        ]
        guard let url = components.url else {
            throw APIError(message: "Invalid update link.")
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        return try await sendWithRetry(request, retries: 2)
    }

    static func confirmApplicantRegistration(
        baseURL: String,
        token: String
    ) async throws -> ApplicantRegistrationConfirmationResponse {
        let trimmedToken = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedToken.isEmpty else {
            throw APIError(message: "Missing confirmation token.")
        }

        guard var components = URLComponents(
            url: try makeURL(baseURL: baseURL, path: "/api/applicant/confirm-registration"),
            resolvingAgainstBaseURL: false
        ) else {
            throw APIError(message: "Invalid API base URL.")
        }
        components.queryItems = [URLQueryItem(name: "mode", value: "mobile")]
        guard let url = components.url else {
            throw APIError(message: "Invalid confirmation URL.")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = try JSONSerialization.data(withJSONObject: ["token": trimmedToken], options: [])
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("ios-app", forHTTPHeaderField: "X-iRefair-Client")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw APIError(message: "Invalid server response.")
            }
            guard isLikelyJSONResponse(http: http, data: data) else {
                throw nonJSONResponseError(for: request, response: http, data: data)
            }
            return try decode(ApplicantRegistrationConfirmationResponse.self, from: data)
        } catch let error as URLError {
            throw APIError(message: mapURLError(error))
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError(message: "Unexpected server response.")
        }
    }

    static func submitReferrerFeedback(
        baseURL: String,
        token: String,
        applicantId: String,
        feedback: String,
        rating: Int,
        recommend: Bool
    ) async throws -> ReferrerFeedbackResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/referrer/portal/feedback")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        let payload: [String: Any] = [
            "applicantId": applicantId,
            "feedback": feedback,
            "rating": rating,
            "recommend": recommend,
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return try await send(request)
    }

    static func submitReferrerPortalAction(
        baseURL: String,
        token: String,
        payload: [String: Any]
    ) async throws -> ReferrerFeedbackResponse {
        let url = try makeURL(baseURL: baseURL, path: "/api/referrer/portal/feedback")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return try await send(request)
    }

    private static func makeURL(baseURL: String, path: String) throws -> URL {
        let sanitized = Validator.sanitizeBaseURL(baseURL)
        guard let url = URL(string: sanitized + path) else {
            throw APIError(message: "Invalid API base URL.")
        }
        return url
    }

    private static func sendJSON<T: APIResult>(url: URL, payload: [String: String]) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await send(request)
    }

    private static func send<T: APIResult>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(message: "Invalid server response.")
        }
        guard isLikelyJSONResponse(http: http, data: data) else {
            throw nonJSONResponseError(for: request, response: http, data: data)
        }
        let decoded = try decode(T.self, from: data)
        if (200..<300).contains(http.statusCode) {
            return try decoded.validated()
        }
        throw APIError(message: decoded.error ?? "Request failed with status \(http.statusCode).")
    }

    private static func sendWithRetry<T: APIResult>(_ request: URLRequest, retries: Int) async throws -> T {
        var attempt = 0
        var delay: UInt64 = 500_000_000
        while true {
            do {
                return try await send(request)
            } catch let error as URLError {
                if attempt >= retries {
                    Telemetry.capture(error)
                    throw APIError(message: mapURLError(error))
                }
                try await Task.sleep(nanoseconds: delay)
                delay *= 2
                attempt += 1
            } catch let error as APIError {
                Telemetry.capture(error)
                throw error
            } catch {
                Telemetry.capture(error)
                throw APIError(message: "Unexpected server response.")
            }
        }
    }

    private static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            if let text = String(data: data, encoding: .utf8), !text.isEmpty {
                throw APIError(message: text)
            }
            throw APIError(message: "Unexpected server response.")
        }
    }

    private static func mapURLError(_ error: URLError) -> String {
        switch error.code {
        case .notConnectedToInternet, .networkConnectionLost:
            return "You appear to be offline. Check your connection and try again."
        case .timedOut:
            return "The request timed out. Please try again."
        default:
            return "Network error. Please try again."
        }
    }

    private static func isLikelyJSONResponse(http: HTTPURLResponse, data: Data) -> Bool {
        if let contentType = http.value(forHTTPHeaderField: "Content-Type")?.lowercased(),
           contentType.contains("application/json") {
            return true
        }

        guard let firstNonWhitespaceByte = data.first(where: { byte in
            switch byte {
            case 0x09, 0x0A, 0x0D, 0x20:
                return false
            default:
                return true
            }
        }) else {
            return false
        }

        return firstNonWhitespaceByte == 0x7B || firstNonWhitespaceByte == 0x5B
    }

    private static func nonJSONResponseError(for request: URLRequest, response http: HTTPURLResponse, data: Data) -> APIError {
        let statusCode = http.statusCode
        let requestHost = request.url?.host?.lowercased()
        let responseHost = http.url?.host?.lowercased()

        if let requestHost, let responseHost, requestHost != responseHost {
            return APIError(
                message: "API host redirected from \(requestHost) to \(responseHost). Update API_BASE_URL and try again."
            )
        }

        if (300..<400).contains(statusCode),
           let location = http.value(forHTTPHeaderField: "Location"),
           !location.isEmpty {
            return APIError(message: "API request was redirected to \(location). Update API_BASE_URL and try again.")
        }

        if let preview = responsePreview(data), !preview.isEmpty {
            return APIError(message: "Unexpected server response (HTTP \(statusCode)): \(preview)")
        }

        return APIError(message: "Unexpected server response (HTTP \(statusCode)). Please try again later.")
    }

    private static func responsePreview(_ data: Data, maxLength: Int = 140) -> String? {
        guard let text = String(data: data, encoding: .utf8) else {
            return nil
        }

        let normalized = text
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !normalized.isEmpty else {
            return nil
        }

        if normalized.count <= maxLength {
            return normalized
        }

        let endIndex = normalized.index(normalized.startIndex, offsetBy: maxLength)
        return "\(normalized[..<endIndex])..."
    }
}
