package codegenjson

//go:generate go tool tinybind-gen -dir . -name tinybind_gen.go -openapi=false

import (
	"io"

	"github.com/shibukawa/tinybind-go/jsonbind"
)

func decodeDocumentSet(r io.Reader) (CanonicalDocumentSet, error) {
	return jsonbind.DecodeJSON[CanonicalDocumentSet](r)
}

func decodeProjectState(r io.Reader) (ProjectState, error) {
	return jsonbind.DecodeJSON[ProjectState](r)
}

func encodeOutputJSON(w io.Writer, document ExchangeDocument) error {
	return jsonbind.EncodeJSON[ExchangeDocument](w, document)
}

func decodeMarkdownOptions(r io.Reader) (MarkdownOptions, error) {
	return jsonbind.DecodeJSON[MarkdownOptions](r)
}

func decodeSQLExportOptions(r io.Reader) (SQLExportOptions, error) {
	return jsonbind.DecodeJSON[SQLExportOptions](r)
}

func decodeDiagramExportOptions(r io.Reader) (DiagramExportOptions, error) {
	return jsonbind.DecodeJSON[DiagramExportOptions](r)
}

func writeExportResultJSON(w io.Writer, result ExportResult) error {
	return jsonbind.EncodeJSON[ExportResult](w, result)
}
