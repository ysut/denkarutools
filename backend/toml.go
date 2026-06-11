package main

// Minimal TOML parser covering the subset used by regimens.toml:
//   - comments (#) and blank lines
//   - [table] and [[array-of-tables]] headers with dotted bare keys
//   - key = value pairs where value is a basic/literal string, bool,
//     integer, float, or a (possibly multiline) array of those
// Kept dependency-free on purpose: go.mod has no external modules and the
// backend container runs `go run` without network access.

import (
	"fmt"
	"strconv"
	"strings"
)

// ParseTOML parses input into a generic map suitable for JSON encoding.
func ParseTOML(input string) (map[string]interface{}, error) {
	root := map[string]interface{}{}
	current := root
	lines := strings.Split(input, "\n")

	for i := 0; i < len(lines); i++ {
		line := strings.TrimSpace(stripTOMLComment(lines[i]))
		if line == "" {
			continue
		}

		switch {
		case strings.HasPrefix(line, "[[") && strings.HasSuffix(line, "]]"):
			path := strings.TrimSpace(line[2 : len(line)-2])
			tbl, err := tomlAppendTable(root, splitTOMLPath(path))
			if err != nil {
				return nil, fmt.Errorf("line %d: %v", i+1, err)
			}
			current = tbl

		case strings.HasPrefix(line, "[") && strings.HasSuffix(line, "]"):
			path := strings.TrimSpace(line[1 : len(line)-1])
			tbl, err := tomlDefineTable(root, splitTOMLPath(path))
			if err != nil {
				return nil, fmt.Errorf("line %d: %v", i+1, err)
			}
			current = tbl

		default:
			eq := strings.Index(line, "=")
			if eq < 0 {
				return nil, fmt.Errorf("line %d: expected key = value", i+1)
			}
			key := strings.TrimSpace(line[:eq])
			key = strings.Trim(key, `"'`)
			valStr := strings.TrimSpace(line[eq+1:])
			// Arrays may span multiple lines; keep appending until brackets balance.
			for !tomlBracketsBalanced(valStr) && i+1 < len(lines) {
				i++
				valStr += "\n" + strings.TrimSpace(stripTOMLComment(lines[i]))
			}
			val, err := parseTOMLValue(strings.TrimSpace(valStr))
			if err != nil {
				return nil, fmt.Errorf("line %d (key %q): %v", i+1, key, err)
			}
			current[key] = val
		}
	}
	return root, nil
}

func splitTOMLPath(path string) []string {
	parts := strings.Split(path, ".")
	for i := range parts {
		parts[i] = strings.Trim(strings.TrimSpace(parts[i]), `"'`)
	}
	return parts
}

// tomlDescend resolves one intermediate path element: descends into a map,
// or into the last element of an array of tables.
func tomlDescend(node map[string]interface{}, key string) (map[string]interface{}, error) {
	existing, ok := node[key]
	if !ok {
		child := map[string]interface{}{}
		node[key] = child
		return child, nil
	}
	switch v := existing.(type) {
	case map[string]interface{}:
		return v, nil
	case []interface{}:
		if len(v) == 0 {
			return nil, fmt.Errorf("cannot descend into empty array %q", key)
		}
		last, ok := v[len(v)-1].(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("%q is not an array of tables", key)
		}
		return last, nil
	default:
		return nil, fmt.Errorf("key %q already holds a value", key)
	}
}

func tomlAppendTable(root map[string]interface{}, path []string) (map[string]interface{}, error) {
	node := root
	for _, key := range path[:len(path)-1] {
		next, err := tomlDescend(node, key)
		if err != nil {
			return nil, err
		}
		node = next
	}
	last := path[len(path)-1]
	arr, _ := node[last].([]interface{})
	if node[last] != nil && arr == nil {
		return nil, fmt.Errorf("key %q already holds a non-array value", last)
	}
	tbl := map[string]interface{}{}
	node[last] = append(arr, tbl)
	return tbl, nil
}

func tomlDefineTable(root map[string]interface{}, path []string) (map[string]interface{}, error) {
	node := root
	for _, key := range path {
		next, err := tomlDescend(node, key)
		if err != nil {
			return nil, err
		}
		node = next
	}
	return node, nil
}

// stripTOMLComment removes a trailing # comment, ignoring # inside strings.
func stripTOMLComment(line string) string {
	inBasic, inLiteral, escaped := false, false, false
	for i, r := range line {
		if escaped {
			escaped = false
			continue
		}
		switch {
		case inBasic && r == '\\':
			escaped = true
		case inBasic && r == '"':
			inBasic = false
		case inLiteral && r == '\'':
			inLiteral = false
		case !inBasic && !inLiteral && r == '"':
			inBasic = true
		case !inBasic && !inLiteral && r == '\'':
			inLiteral = true
		case !inBasic && !inLiteral && r == '#':
			return line[:i]
		}
	}
	return line
}

func tomlBracketsBalanced(s string) bool {
	depth := 0
	inBasic, inLiteral, escaped := false, false, false
	for _, r := range s {
		if escaped {
			escaped = false
			continue
		}
		switch {
		case inBasic && r == '\\':
			escaped = true
		case inBasic && r == '"':
			inBasic = false
		case inLiteral && r == '\'':
			inLiteral = false
		case !inBasic && !inLiteral && r == '"':
			inBasic = true
		case !inBasic && !inLiteral && r == '\'':
			inLiteral = true
		case !inBasic && !inLiteral && r == '[':
			depth++
		case !inBasic && !inLiteral && r == ']':
			depth--
		}
	}
	return depth <= 0
}

// splitTOMLArrayItems splits the inside of an array on top-level commas.
func splitTOMLArrayItems(s string) []string {
	var items []string
	depth := 0
	inBasic, inLiteral, escaped := false, false, false
	start := 0
	for i, r := range s {
		if escaped {
			escaped = false
			continue
		}
		switch {
		case inBasic && r == '\\':
			escaped = true
		case inBasic && r == '"':
			inBasic = false
		case inLiteral && r == '\'':
			inLiteral = false
		case !inBasic && !inLiteral && r == '"':
			inBasic = true
		case !inBasic && !inLiteral && r == '\'':
			inLiteral = true
		case !inBasic && !inLiteral && r == '[':
			depth++
		case !inBasic && !inLiteral && r == ']':
			depth--
		case !inBasic && !inLiteral && depth == 0 && r == ',':
			items = append(items, s[start:i])
			start = i + len(",")
		}
	}
	items = append(items, s[start:])
	return items
}

func parseTOMLValue(s string) (interface{}, error) {
	if s == "" {
		return nil, fmt.Errorf("empty value")
	}
	switch {
	case strings.HasPrefix(s, `"`):
		return strconv.Unquote(s)
	case strings.HasPrefix(s, "'") && strings.HasSuffix(s, "'") && len(s) >= 2:
		return s[1 : len(s)-1], nil
	case strings.HasPrefix(s, "["):
		if !strings.HasSuffix(s, "]") {
			return nil, fmt.Errorf("unterminated array")
		}
		inner := strings.TrimSpace(s[1 : len(s)-1])
		result := []interface{}{}
		if inner == "" {
			return result, nil
		}
		for _, item := range splitTOMLArrayItems(inner) {
			item = strings.TrimSpace(item)
			if item == "" { // tolerate trailing comma
				continue
			}
			v, err := parseTOMLValue(item)
			if err != nil {
				return nil, err
			}
			result = append(result, v)
		}
		return result, nil
	case s == "true":
		return true, nil
	case s == "false":
		return false, nil
	default:
		if n, err := strconv.ParseInt(s, 10, 64); err == nil {
			return n, nil
		}
		if f, err := strconv.ParseFloat(s, 64); err == nil {
			return f, nil
		}
		return nil, fmt.Errorf("unsupported value: %s", s)
	}
}
