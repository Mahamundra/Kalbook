/**
 * Video utility functions
 * Extracts frames from video files for use as poster images
 */

/**
 * Extracts the first frame from a video file and returns it as a Blob
 * @param file - Video file to extract frame from
 * @returns Promise that resolves to a Blob containing the frame as JPEG image
 */
export async function extractVideoFrame(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Create a video element
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';

    // Create object URL from file
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    // Handle errors
    const handleError = (error: Error) => {
      URL.revokeObjectURL(objectUrl);
      if (video.parentNode) {
        document.body.removeChild(video);
      }
      reject(error);
    };

    video.onerror = () => {
      handleError(new Error('Failed to load video file'));
    };

    // Wait for metadata to load
    video.onloadedmetadata = () => {
      // Seek to the first frame (time 0)
      video.currentTime = 0;
    };

    // When seeked to first frame, capture it
    video.onseeked = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob (JPEG format)
        canvas.toBlob(
          (blob) => {
            // Clean up
            URL.revokeObjectURL(objectUrl);
            if (video.parentNode) {
              document.body.removeChild(video);
            }

            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          },
          'image/jpeg',
          0.92 // Quality (0-1)
        );
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Failed to extract video frame'));
      }
    };

    // Add video to DOM (required for some browsers)
    document.body.appendChild(video);

    // Load the video
    video.load();
  });
}

