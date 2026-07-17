package codegenjson

import (
	"bytes"
	"fmt"
)

func GenerateMarkdownJSON(input, optionsJSON []byte) ([]byte, error) {
	options, err := decodeMarkdownOptions(bytes.NewReader(defaultOptionsJSON(optionsJSON)))
	if err != nil {
		return nil, fmt.Errorf("decode Markdown export options: %w", err)
	}
	result, err := GenerateMarkdown(input, options)
	if err != nil {
		return nil, err
	}
	return encodeExportResultJSON(result)
}

func GenerateSQLJSON(input, optionsJSON []byte) ([]byte, error) {
	options, err := decodeSQLExportOptions(bytes.NewReader(defaultOptionsJSON(optionsJSON)))
	if err != nil {
		return nil, fmt.Errorf("decode SQL export options: %w", err)
	}
	result, err := GenerateSQL(input, options)
	if err != nil {
		return nil, err
	}
	return encodeExportResultJSON(result)
}

func encodeExportResultJSON(result ExportResult) ([]byte, error) {
	var output bytes.Buffer
	if err := writeExportResultJSON(&output, result); err != nil {
		return nil, fmt.Errorf("encode export result: %w", err)
	}
	return output.Bytes(), nil
}

func defaultOptionsJSON(input []byte) []byte {
	if len(bytes.TrimSpace(input)) == 0 {
		return []byte("{}")
	}
	return input
}
