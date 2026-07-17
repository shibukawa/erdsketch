//go:build js && wasm

package main

import (
	"syscall/js"

	"erdsketch/server/codegenjson"
)

func main() {
	js.Global().Set("erdsketchConvertCodegenJSON", js.FuncOf(convertCodegenJSON))
	js.Global().Set("erdsketchExportMarkdown", js.FuncOf(exportMarkdown))
	js.Global().Set("erdsketchExportSQL", js.FuncOf(exportSQL))
	select {}
}

func convertCodegenJSON(_ js.Value, args []js.Value) any {
	result := js.Global().Get("Object").New()
	if len(args) != 1 || args[0].Type() != js.TypeString {
		result.Set("ok", false)
		result.Set("error", "expected one canonical project JSON string")
		return result
	}
	output, err := codegenjson.Convert([]byte(args[0].String()))
	if err != nil {
		result.Set("ok", false)
		result.Set("error", err.Error())
		return result
	}
	result.Set("ok", true)
	result.Set("json", string(output))
	return result
}

func exportMarkdown(_ js.Value, args []js.Value) any {
	return exportResult(args, "Markdown", codegenjson.GenerateMarkdownJSON)
}

func exportSQL(_ js.Value, args []js.Value) any {
	return exportResult(args, "SQL", codegenjson.GenerateSQLJSON)
}

func exportResult(args []js.Value, format string, generate func([]byte, []byte) ([]byte, error)) any {
	result := js.Global().Get("Object").New()
	if len(args) != 2 || args[0].Type() != js.TypeString || args[1].Type() != js.TypeString {
		result.Set("ok", false)
		result.Set("error", "expected canonical project JSON and "+format+" options JSON strings")
		return result
	}
	output, err := generate([]byte(args[0].String()), []byte(args[1].String()))
	if err != nil {
		result.Set("ok", false)
		result.Set("error", err.Error())
		return result
	}
	result.Set("ok", true)
	result.Set("json", string(output))
	return result
}
