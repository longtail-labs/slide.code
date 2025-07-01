.PHONY: setup install-tools deps templ-generate build run dev clean templ server tailwind-clean tailwind-watch

setup: install-tools deps templ-generate
	@echo "✅ Setup complete!"

install-tools:
	@echo "📦 Installing development tools..."
	@go install github.com/a-h/templ/cmd/templ@latest
	@go install github.com/air-verse/air@latest

deps:
	@echo "📦 Installing dependencies..."
	@go mod tidy
	@go mod download

templ-generate:
	@echo "🎨 Generating templ files..."
	@templ generate

build: templ-generate tailwind-clean
	@echo "🏗️  Building application..."
	@go build -o bin/server .

run: templ-generate
	@echo "🚀 Running application..."
	@go run .

# Run templ generation in watch mode to detect all .templ files and 
# re-create _templ.txt files on change, then send reload event to browser. 
# Default url: http://localhost:7331
templ:
	templ generate --watch --proxy="http://localhost:3000" --open-browser=false

# Run air to detect any go file changes to re-build and re-run the server.
server:
	air \
	--build.cmd "go build -o tmp/bin/main ./server.go" \
	--build.bin "tmp/bin/main" \
	--build.delay "100" \
	--build.exclude_dir "node_modules" \
	--build.include_ext "go" \
	--build.stop_on_error "false" \
	--misc.clean_on_exit true

tailwind-clean:
	tailwindcss -i ./assets/css/input.css -o ./assets/css/output.css --clean

# Run tailwindcss to generate the styles.css bundle in watch mode.
tailwind-watch:
	tailwindcss -i ./assets/css/input.css -o ./assets/css/output.css --watch

# Start development server
dev:
	make tailwind-clean
	make -j3 tailwind-watch templ server

dev-templ:
	@echo "🔥 Starting development with templ watch + proxy..."
	@echo "🌐 Server will be available at http://localhost:3000"
	@echo "🔄 Hot reload proxy at http://localhost:7331"
	@templ generate --watch --proxy="http://localhost:3000" --cmd="go run ."

clean:
	@echo "🧹 Cleaning up..."
	@rm -rf tmp/
	@rm -rf bin/
	@rm -f *_templ.go
	@rm -f assets/css/output.css 

start-baml:
	npx @boundaryml/baml dev