package main

// The production release embeds the built frontend (frontend/dist) into the
// binary so a single .exe can serve both the UI and the API on offline
// hospital terminals. scripts/build-release.sh copies the dist output into
// backend/static before compiling; in development only placeholder.html is
// present and the UI is served by the Vue dev server instead.

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed all:static
var embeddedStatic embed.FS

func staticHandler() http.Handler {
	sub, err := fs.Sub(embeddedStatic, "static")
	if err != nil {
		panic(err)
	}
	return http.FileServer(http.FS(sub))
}
