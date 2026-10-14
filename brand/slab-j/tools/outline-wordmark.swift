import Foundation
import CoreText
import CoreGraphics
import CryptoKit

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data((message + "\n").utf8)); exit(1)
}
func number(_ value: CGFloat) -> String {
    var s = String(format:"%.6f",locale:Locale(identifier:"en_US_POSIX"),Double(abs(value)<0.0000005 ? 0 : value))
    while s.last == "0" { s.removeLast() }; if s.last == "." { s.removeLast() }; return s
}
let args = Array(CommandLine.arguments.dropFirst())
guard args.count == 2 else { fail("Usage: outline-wordmark.swift INTER_FONT_FILE OUTPUT_DIRECTORY") }
let fontURL = URL(fileURLWithPath:args[0])
let outURL = URL(fileURLWithPath:args[1],isDirectory:true)
let fontData = try Data(contentsOf: fontURL)
let fontHash = SHA256.hash(data: fontData).map { String(format: "%02x", $0) }.joined()
guard fontHash == "0be2399ea925f1f83ff974764761da9860ec50742ed29a5d4c1ffd0c5c7ac3a8" else { fail("Inter font fingerprint differs from the approved source") }
guard let descriptors = CTFontManagerCreateFontDescriptorsFromURL(fontURL as CFURL) as? [CTFontDescriptor], let base = descriptors.first else { fail("Cannot read font file") }
let wght = NSNumber(value:UInt32(0x77676874))
let opsz = NSNumber(value:UInt32(0x6f70737a))
let descriptor = CTFontDescriptorCreateCopyWithAttributes(base,[kCTFontVariationAttribute:[wght:NSNumber(value:780),opsz:NSNumber(value:32)]] as CFDictionary)
try FileManager.default.createDirectory(at:outURL,withIntermediateDirectories:true)
for (slug,label,size,baseline) in [("judgmentkit","JudgmentKit",64.0,0.0)] {
    let font = CTFontCreateWithFontDescriptor(descriptor,CGFloat(size),nil)
    let family = CTFontCopyFamilyName(font) as String
    guard family.lowercased().contains("inter") else { fail("Font resolved to \(family)") }
    guard let variation = CTFontCopyVariation(font) as? [NSNumber:NSNumber], abs((variation[wght]?.doubleValue ?? -1)-780)<0.001,abs((variation[opsz]?.doubleValue ?? -1)-32)<0.001 else { fail("Font axis mismatch") }
    let name = CTFontCopyPostScriptName(font) as String
    let attributes:[NSAttributedString.Key:Any] = [NSAttributedString.Key(kCTFontAttributeName as String):font,NSAttributedString.Key(kCTLigatureAttributeName as String):1]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string:label,attributes:attributes))
    let width = CTLineGetTypographicBounds(line,nil,nil,nil)
    var paths:[String]=[]; var bounds=CGRect.null; var glyphCount=0
    for run in CTLineGetGlyphRuns(line) as! [CTRun] {
        let attrs = CTRunGetAttributes(run) as NSDictionary
        let runFont = attrs[kCTFontAttributeName] as! CTFont
        guard CTFontCopyPostScriptName(runFont) as String == name else { fail("Fallback run detected") }
        guard let runVariation = CTFontCopyVariation(runFont) as? [NSNumber:NSNumber],abs((runVariation[wght]?.doubleValue ?? -1)-780)<0.001 else { fail("Run weight mismatch") }
        let count = CTRunGetGlyphCount(run)
        var glyphs=[CGGlyph](repeating:0,count:count);var positions=[CGPoint](repeating:.zero,count:count)
        CTRunGetGlyphs(run,CFRange(location:0,length:0),&glyphs); CTRunGetPositions(run,CFRange(location:0,length:0),&positions)
        for i in 0..<count {
            guard let path=CTFontCreatePathForGlyph(runFont,glyphs[i],nil) else { fail("Missing glyph") }
            var transform=CGAffineTransform(a:1,b:0,c:0,d:-1,tx:positions[i].x,ty:CGFloat(baseline)-positions[i].y)
            guard let svgPath=path.copy(using:&transform) else { fail("Path transform failed") }
            bounds=bounds.union(svgPath.boundingBoxOfPath)
            var commands:[String]=[]
            svgPath.applyWithBlock { p in
                let e=p.pointee
                func point(_ i:Int)->String { return "\(number(e.points[i].x)) \(number(e.points[i].y))" }
                switch e.type {
                case .moveToPoint:commands.append("M\(point(0))")
                case .addLineToPoint:commands.append("L\(point(0))")
                case .addQuadCurveToPoint:commands.append("Q\(point(0)) \(point(1))")
                case .addCurveToPoint:commands.append("C\(point(0)) \(point(1)) \(point(2))")
                case .closeSubpath:commands.append("Z")
                @unknown default:fail("Unsupported path")
                }
            }
            paths.append("<path d=\"\(commands.joined(separator:" "))\"/>"); glyphCount += 1
        }
    }
    let svg="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"\(number(bounds.minX)) \(number(bounds.minY)) \(number(bounds.width)) \(number(bounds.height))\" role=\"img\"><title>\(label) in Inter 780</title>\(paths.joined())</svg>\n"
    try svg.write(to:outURL.appendingPathComponent(slug+"-wordmark.svg"),atomically:true,encoding:.utf8)
    let metadata:[String:Any] = ["text":label,"fontFile":fontURL.path,"fontFamily":family,"postScriptName":name,"weightAxis":780,"opticalSizeAxis":32,"fontSize":size,"capHeight":Double(CTFontGetCapHeight(font)),"xHeight":Double(CTFontGetXHeight(font)),"baseline":baseline,"glyphCount":glyphCount,"advanceWidth":width,"inkBounds":["x":Double(bounds.minX),"y":Double(bounds.minY),"width":Double(bounds.width),"height":Double(bounds.height)],"fallbackRuns":0,"format":"CoreText shaped vector outlines"]
    let data=try JSONSerialization.data(withJSONObject:metadata,options:[.prettyPrinted,.sortedKeys,.withoutEscapingSlashes])
    try (data+Data("\n".utf8)).write(to:outURL.appendingPathComponent("metrics.json"))
    print("\(label): \(family), wght=780, opsz=32, \(glyphCount) outlined glyphs, no fallback")
}
