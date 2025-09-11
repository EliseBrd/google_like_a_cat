// UploadService.java
package pdf.archi_web.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import pdf.archi_web.PdfIndexer;

import java.nio.file.*;

@Service
public class UploadService {

    private final Path storageDir;
    private final PdfIndexer indexer;

    public UploadService() throws Exception {
        this.storageDir = Path.of("src/main/resources/static/pdf").toAbsolutePath().normalize();
        Files.createDirectories(this.storageDir);

        this.indexer = new PdfIndexer("index");
    }

    public UploadResult storeAndIndex(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fichier vide.");
        }

        String name = Paths.get(file.getOriginalFilename() == null ? "fichier.pdf" : file.getOriginalFilename())
                           .getFileName().toString();

        if (!name.toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("Le fichier doit avoir l'extension .pdf.");
        }

        Path target = storageDir.resolve(name);
        Files.write(target, file.getBytes(), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

        // Indexation immédiate
        indexer.indexPdf(target.toString());

        String publicUrl = "/pdf/" + name;
        return new UploadResult(name, publicUrl, target.toString());
    }

    public static class UploadResult {
        private final String filename;
        private final String url;
        private final String absolutePath;

        public UploadResult(String filename, String url, String absolutePath) {
            this.filename = filename;
            this.url = url;
            this.absolutePath = absolutePath;
        }
        public String getFilename() { return filename; }
        public String getUrl() { return url; }
        public String getAbsolutePath() { return absolutePath; }
    }
}

