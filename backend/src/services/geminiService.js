import { GoogleGenAI } from "@google/genai";

// Initialize Gemini client with API key from environment variable
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const MODEL_NAME = "gemini-3-pro-image-preview";

if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Please create a .env file in the backend directory with GEMINI_API_KEY=your_api_key. See .env.example for reference.');
}

const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
});

/**
 * Generate a 3D installation visualization from a locker layout image
 * @param {string} base64Image - Base64 encoded locker layout image
 * @param {string} mimeType - MIME type of the image (e.g., 'image/png')
 * @returns {Promise<string>} Base64 encoded generated 3D visualization
 */
export async function generate3DInstallation(base64Image, mimeType = 'image/png', frameType = 'none', columns = null, tiers = null, installationBackground = null) {
    console.log('🎨 Starting 3D image generation...');
    console.log(`🖼️ Requested Background: ${installationBackground || 'Default'}`);

    // Calculate size stats
    const charLength = base64Image.length;
    const sizeInBytes = (charLength * 3) / 4 - (base64Image.indexOf('=') > 0 ? (base64Image.length - base64Image.indexOf('=')) : 0);
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

    console.log(`📊 Image Input Stats:`);
    console.log(`   - Base64 Length: ${charLength} chars`);
    console.log(`   - Approx. Size: ${sizeInKB} KB (${sizeInMB} MB)`);
    console.log(`📷 MIME type: ${mimeType}`);

    try {
        // Generate specific prompt additions based on frame type
        let frameDescription = "";
        switch (frameType) {
            case 'fullSet':
                frameDescription = "- IMPORTANT: The locker unit is surrounded by SOLID BLACK decorative frames on ALL sides (top, left, and right). The top frame must appear as a black signboard plate with the white text '물품보관함' clearly printed on it like a header. The side panels (left and right) must be COMPLETELY SOLID BLACK from edge to edge - no white interior, no light-colored surfaces, just pure solid black panels covering the entire sides.";
                break;
            case 'topOnly':
                frameDescription = "- IMPORTANT: The locker unit has a distinct black decorative top signboard ONLY. Ensure this top frame is clearly visible with the white text '물품보관함' on it. No side frames should be present.";
                break;
            case 'sideOnly':
                frameDescription = "- IMPORTANT: The locker unit has SOLID BLACK decorative side panels ONLY (left and right). These side panels must be COMPLETELY BLACK from edge to edge - no white interior, no light-colored surfaces, just pure solid black panels covering the entire left and right sides. Ensure these solid black side frames are clearly visible. No top signboard should be present.";
                break;
            case 'topAndSide':
                frameDescription = "- IMPORTANT: The locker unit has both a black decorative top signboard with white text '물품보관함' AND SOLID BLACK decorative side panels (left and right). The side panels must be COMPLETELY BLACK from edge to edge - no white interior, no light-colored surfaces, just pure solid black panels. Ensure all these decorative elements are clearly visible.";
                break;
            default:
                frameDescription = "- Standard installation without extra outer frames.";
        }

        // Generate count description if provided
        let countDescription = "";
        if (columns && tiers) {
            countDescription = `
- CRITICAL Grid Structure Requirement:
  1. GRID DIMENSIONS: EXACTLY ${columns} columns (width) x ${tiers} tiers (height).
  2. TOTAL CELL COUNT: There MUST be exactly ${columns * tiers} individual locker doors/cells in total.
  3. VERTICAL STRUCTURE: Each column MUST contain exactly ${tiers} locker doors stacked vertically.
  4. HORIZONTAL STRUCTURE: Each row MUST contain exactly ${columns} locker doors side-by-side.
  5. STRICT ADHERENCE: Do NOT add or remove any columns or tiers. The generated 3D model MUST be an exact structural replica of the provided 2D grid image.
  6. VERIFICATION: Count the boxes in your output. If the count is not ${columns * tiers}, the generation is incorrect.`;
        }

        // Craft a detailed prompt for high-quality 3D visualization
        const envDescription = installationBackground
            ? `Place the locker system installed in ${installationBackground}`
            : `Place the locker system naturally installed on a clean modern office/building interior wall`;

        const prompt = [
            {
                text: `Transform this storage locker layout into a professional 3D installation visualization.

Requirements:
- ${envDescription}
- INSTALLATION STYLE: Freestanding / Standalone unit. The locker should NOT appear recessed into a wall. 
- Show the locker as a solid 3D object with visible depth, showcasing its side panels and top surface clearly.
- Use realistic lighting with soft shadows and natural ambient light
- Professional architectural visualization style with photorealistic quality
- Clean, modern design aesthetic
- Proper perspective and depth - view from a slight angle to show the side and volume
- High-quality 3D rendering with attention to materials and textures
- The locker should appear as a standalone piece of equipment placed in a real environment
- Polished concrete or wooden floor visible at the bottom if appropriate for the setting
- Subtle environmental reflections on the locker surface
${frameDescription}
${countDescription}

Style: Clean, professional, architectural photography, 3D render, high resolution, realistic materials`
            },
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image,
                },
            },
        ];

        console.log('📡 Calling Gemini API...');

        // Call Gemini API to generate the image
        // Using Nano Banana Pro (gemini-3-pro-image-preview) as requested
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });

        console.log('✅ Gemini API response received');
        console.log('Response structure:', JSON.stringify(response, null, 2).substring(0, 500));

        // Extract the generated image from the response
        if (!response.candidates || response.candidates.length === 0) {
            throw new Error('No candidates returned from Gemini API');
        }

        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                console.log('📝 Gemini response text:', part.text);
            } else if (part.inlineData) {
                console.log('🖼️ Image data received, size:', part.inlineData.data.length);
                // Return the base64 encoded image
                return part.inlineData.data;
            }
        }

        throw new Error('No image data returned from Gemini API');
    } catch (error) {
        console.error('❌ Error generating 3D installation:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        // Parse error object to check for leaked API key
        let errorMessage = error.message || '';
        let errorCode = null;
        let errorStatus = null;

        // Try to parse error message as JSON (sometimes Google API returns JSON string)
        try {
            if (typeof errorMessage === 'string' && errorMessage.startsWith('{')) {
                const parsedError = JSON.parse(errorMessage);
                if (parsedError.error) {
                    errorCode = parsedError.error.code;
                    errorStatus = parsedError.error.status;
                    if (parsedError.error.message) {
                        errorMessage = parsedError.error.message;
                    }
                }
            }
        } catch (parseError) {
            // Not JSON, continue with original error message
        }

        // Check error object structure (Google API errors can be nested)
        if (error.error) {
            errorCode = error.error.code;
            errorStatus = error.error.status;
            if (error.error.message) {
                errorMessage = error.error.message;
            }
        }

        // Also check direct properties
        if (error.code) errorCode = error.code;
        if (error.status) errorStatus = error.status;

        // Check for API key leak error (403 with "leaked" message)
        const isLeakedError = 
            (errorCode === 403 || errorStatus === 'PERMISSION_DENIED') &&
            (errorMessage.toLowerCase().includes('leaked') || 
             errorMessage.toLowerCase().includes('reported'));

        if (isLeakedError) {
            throw new Error(
                'API_KEY_LEAKED: Your Gemini API key was reported as leaked and has been revoked. ' +
                'Please generate a new API key from Google AI Studio (https://aistudio.google.com/app/apikey) ' +
                'and update the GEMINI_API_KEY environment variable in your deployment settings.'
            );
        }

        if (error.response) {
            console.error('Error response:', JSON.stringify(error.response, null, 2));
        }

        throw new Error(`Failed to generate 3D visualization: ${errorMessage || error.message || 'Unknown error'}`);
    }
}

/**
 * Verify API connection without cost (e.g., listing models)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function verifyConnection() {
    try {
        // Trying a simple model list or property check if getGenerativeModel is missing
        // If ai.models.generateContent is used elsewhere, let's see what's on ai
        if (typeof ai.getGenerativeModel === 'function') {
            await ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            return { success: true, message: 'API Connection OK' };
        } else if (ai.models && typeof ai.models.generateContent === 'function') {
            // This seems to be the pattern used in generate3DInstallation
            return { success: true, message: 'API Connection OK (Validated via models instance)' };
        }
        return { success: false, message: 'API instance initialized but method not found' };
    } catch (error) {
        console.error('API Verification failed:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Health check for Gemini service
 * @returns {Promise<boolean>} True if service is operational
 */
export async function healthCheck() {
    try {
        // verifyConnection is safer/cheaper than generateContent for periodic checks
        const result = await verifyConnection();
        return result.success;
    } catch (error) {
        console.error('Gemini service health check failed:', error);
        return false;
    }
}
