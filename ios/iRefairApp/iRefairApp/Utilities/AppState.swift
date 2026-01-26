import Foundation

enum AppTab: Hashable {
    case applicant
    case apply
    case referrer
    case settings
}

final class AppState: ObservableObject {
    @Published var selectedTab: AppTab = .applicant
}
