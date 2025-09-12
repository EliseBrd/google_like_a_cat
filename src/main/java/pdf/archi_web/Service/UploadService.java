// src/main/java/pdf/archi_web/Service/UploadService.java
package pdf.archi_web.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pdf.archi_web.PdfIndexer;

import java.nio.file.*;
import java.util.UUID;

@Service
public class UploadService {

    private final Path storageDir;       // dossier public servi par Spring: /pdf/*
    private final Path frontPublicDir;   // (optionnel) dossier public du front: front/public/pdf
    private final PdfIndexer indexer;

    public UploadService(
            @Value("${PDF_STORAGE_DIR:/app/pdf}") String storageDirProp,
            @Value("${FRONT_PUBLIC_DIR:}") String frontPublicDirProp
    ) throws Exception {
        this.storageDir = Path.of(storageDirProp).toAbsolutePath().normalize();
        Files.createDirectories(this.storageDir);

        this.indexer = new PdfIndexer("index");

        if (frontPublicDirProp == null || frontPublicDirProp.isBlank()) {
            this.frontPublicDir = null;
        } else {
            this.frontPublicDir = Path.of(frontPublicDirProp).toAbsolutePath().normalize();
            Files.createDirectories(this.frontPublicDir);
        }
    }

    public UploadResult storeAndIndex(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fichier vide.");
        }

        // --- Sécurisation & nommage ---
        String original = file.getOriginalFilename() == null ? "document.pdf" : file.getOriginalFilename();
        // retire tout chemin éventuel, ne garde que le nom
        String baseName = Paths.get(original).getFileName().toString();

        // extension PDF obligatoire
        if (!baseName.toLowerCase().endsWith(".pdf")) {
            throw new IllegalArgumentException("Le fichier doit avoir l'extension .pdf.");
        }

        // évite caractères spéciaux / noms exotiques
        baseName = baseName.replaceAll("[\\\\/:*?\"<>|]+", "_");

        // si le fichier existe déjà, suffixer pour éviter l'écrasement
        Path target = storageDir.resolve(baseName).normalize();
        if (Files.exists(target)) {
            String stem = baseName.substring(0, baseName.length() - 4);
            baseName = stem + "-" + UUID.randomUUID().toString().substring(0, 8) + ".pdf";
            target = storageDir.resolve(baseName).normalize();
        }

        // --- Écriture côté back (STREAM, pas de file.getBytes()) ---
        try (var in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        System.out.println("[Upload] Sauvé back: " + target);

        // --- Copie optionnelle côté front/public/pdf (STREAM) ---
        if (frontPublicDir != null) {
            try {
                Path frontTarget = frontPublicDir.resolve(baseName).normalize();
                try (var in2 = file.getInputStream()) {
                    Files.copy(in2, frontTarget, StandardCopyOption.REPLACE_EXISTING);
                }
                System.out.println("[Upload] Copié front: " + frontTarget);
            } catch (Exception e) {
                System.err.println("[Upload] Copie front échouée: " + e.getMessage());
                // Non bloquant
            }
        }

        // --- Indexation immédiate ---
        indexer.indexPdf(target.toString());

        // URL publique servie par Spring (resources/static)
        String publicUrl = "/pdf/" + baseName;
        return new UploadResult(baseName, publicUrl, target.toString());
    }

    // --- DTO retour ---
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
