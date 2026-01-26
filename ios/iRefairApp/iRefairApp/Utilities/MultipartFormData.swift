import Foundation
import UniformTypeIdentifiers

struct UploadFile {
    let fieldName: String
    let fileName: String
    let mimeType: String
    let data: Data
}

struct MultipartFormDataBuilder {
    private let boundary = "Boundary-\(UUID().uuidString)"
    private var body = Data()

    mutating func addField(name: String, value: String) {
        let fieldData = "--\(boundary)\r\n" +
        "Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n" +
        "\(value)\r\n"
        if let data = fieldData.data(using: .utf8) {
            body.append(data)
        }
    }

    mutating func addFile(_ file: UploadFile) {
        let header = "--\(boundary)\r\n" +
        "Content-Disposition: form-data; name=\"\(file.fieldName)\"; filename=\"\(file.fileName)\"\r\n" +
        "Content-Type: \(file.mimeType)\r\n\r\n"
        if let data = header.data(using: .utf8) {
            body.append(data)
        }
        body.append(file.data)
        if let tail = "\r\n".data(using: .utf8) {
            body.append(tail)
        }
    }

    mutating func finalize() -> (data: Data, boundary: String) {
        if let closing = "--\(boundary)--\r\n".data(using: .utf8) {
            body.append(closing)
        }
        return (body, boundary)
    }
}

enum FileSupport {
    static let maxResumeSize: Int = 10 * 1024 * 1024

    static func mimeType(for url: URL) -> String {
        if let type = UTType(filenameExtension: url.pathExtension), let mime = type.preferredMIMEType {
            return mime
        }
        return "application/octet-stream"
    }

    static func isSupportedResume(_ url: URL) -> Bool {
        let ext = url.pathExtension.lowercased()
        return ["pdf", "doc", "docx"].contains(ext)
    }
}
