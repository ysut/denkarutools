package main

import (
	"os"
	"testing"
)

func TestParseTOMLBasics(t *testing.T) {
	src := `
# comment
[[regimens]]
id = "TC"
daily = false
count = 3
ratio = 1.5

[[regimens.days]]
label = "Day 1"
offset = 0

[[regimens.days.steps]]
time = "10:30-11:00"
drugs = [
  "ガスター 20 mg",
  "生理食塩水 100 mL", # trailing comment
]

[[regimens]]
id = "NGT"
daily = true
`
	parsed, err := ParseTOML(src)
	if err != nil {
		t.Fatalf("ParseTOML failed: %v", err)
	}
	regimens, ok := parsed["regimens"].([]interface{})
	if !ok || len(regimens) != 2 {
		t.Fatalf("expected 2 regimens, got %#v", parsed["regimens"])
	}
	first := regimens[0].(map[string]interface{})
	if first["id"] != "TC" || first["daily"] != false || first["count"] != int64(3) || first["ratio"] != 1.5 {
		t.Errorf("unexpected first regimen: %#v", first)
	}
	days := first["days"].([]interface{})
	steps := days[0].(map[string]interface{})["steps"].([]interface{})
	drugs := steps[0].(map[string]interface{})["drugs"].([]interface{})
	if len(drugs) != 2 || drugs[0] != "ガスター 20 mg" {
		t.Errorf("unexpected drugs: %#v", drugs)
	}
}

func TestParseTOMLRegimensFile(t *testing.T) {
	data, err := os.ReadFile("../regimens.toml")
	if err != nil {
		t.Skipf("regimens.toml not found: %v", err)
	}
	parsed, err := ParseTOML(string(data))
	if err != nil {
		t.Fatalf("ParseTOML(regimens.toml) failed: %v", err)
	}
	regimens, ok := parsed["regimens"].([]interface{})
	if !ok || len(regimens) == 0 {
		t.Fatalf("no regimens parsed: %#v", parsed["regimens"])
	}
	for _, r := range regimens {
		m := r.(map[string]interface{})
		if m["id"] == "" || m["name"] == "" {
			t.Errorf("regimen missing id/name: %#v", m)
		}
		if _, ok := m["days"].([]interface{}); !ok {
			t.Errorf("regimen %v has no days", m["id"])
		}
	}
}
