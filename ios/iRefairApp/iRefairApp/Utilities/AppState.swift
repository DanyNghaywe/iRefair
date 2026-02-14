import Foundation

enum AppTab: Hashable {
    case applicant
    case apply
    case referrer
    case settings
}

final class AppState: ObservableObject {
    @Published var selectedTab: AppTab = .applicant
    @Published var pendingReferrerLoginToken: String?
    @Published var pendingReferrerPortalToken: String?

    func consumePendingReferrerLoginToken() -> String? {
        let token = pendingReferrerLoginToken
        pendingReferrerLoginToken = nil
        return token
    }

    func consumePendingReferrerPortalToken() -> String? {
        let token = pendingReferrerPortalToken
        pendingReferrerPortalToken = nil
        return token
    }
}
