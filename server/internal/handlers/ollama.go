package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"equity-server/internal/models"

	"github.com/gin-gonic/gin"
)

// OllamaHandler handles Ollama-related HTTP requests
type OllamaHandler struct{}

// NewOllamaHandler creates a new Ollama handler
func NewOllamaHandler() *OllamaHandler {
	return &OllamaHandler{}
}

// OllamaModel represents a model from Ollama (simplified)
type OllamaModel struct {
	Name     string `json:"name"`
	Size     string `json:"size"`
	Modified string `json:"modified"`
}

// OllamaAPIResponse represents the response from Ollama API
type OllamaAPIResponse struct {
	Models []struct {
		Name       string `json:"name"`
		ModifiedAt string `json:"modified_at"`
		Size       int64  `json:"size"`
		Digest     string `json:"digest"`
		Details    struct {
			ParameterSize string `json:"parameter_size"`
			Format        string `json:"format"`
			Family        string `json:"family"`
		} `json:"details"`
	} `json:"models"`
}

// GetModels handles GET /api/v1/ollama/models
// Returns a list of available Ollama models
func (h *OllamaHandler) GetModels(c *gin.Context) {
	// Get Ollama API URL from environment or use default
	ollamaURL := os.Getenv("OLLAMA_API_URL")
	if ollamaURL == "" {
		ollamaURL = "http://host.docker.internal:11434" // Docker default
	}

	// Make HTTP request to Ollama API
	resp, err := http.Get(ollamaURL + "/api/tags")
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "ollama_api_failed",
			Message: "Failed to connect to Ollama API: " + err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "ollama_read_failed",
			Message: "Failed to read Ollama API response: " + err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	// Parse JSON response
	var apiResponse OllamaAPIResponse
	if err := json.Unmarshal(body, &apiResponse); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "ollama_parse_failed",
			Message: "Failed to parse Ollama API response: " + err.Error(),
			Code:    http.StatusInternalServerError,
		})
		return
	}

	// Convert to simplified format
	modelList := make([]OllamaModel, len(apiResponse.Models))
	for i, m := range apiResponse.Models {
		// Convert size to human-readable format
		size := formatBytes(m.Size)
		modelList[i] = OllamaModel{
			Name:     m.Name,
			Size:     size,
			Modified: m.ModifiedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"models": modelList,
	})
}

// formatBytes converts bytes to human-readable format
func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
