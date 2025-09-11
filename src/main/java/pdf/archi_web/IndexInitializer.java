package pdf.archi_web;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class IndexInitializer {

  @Value("${pdf.storage-dir:src/main/resources/static/pdf}")
  private String storageDir;

  @PostConstruct
  public void init() throws Exception {
    Path indexPath = Path.of("index");

    // --- 1) Vider l'index existant avant recréation ---
    if (Files.exists(indexPath)) {
      System.out.println("Suppression du cache Lucene...");
      Files.walk(indexPath)
              .map(Path::toFile)
              .sorted((a, b) -> -a.compareTo(b)) // Fichiers d'abord, dossiers ensuite
              .forEach(File::delete);
    }

    // Recréation du dossier index vide
    Files.createDirectories(indexPath);

    // --- 2) Vérifier et préparer le dossier PDF ---
    Path pdfDir = Path.of(storageDir).toAbsolutePath().normalize();
    Files.createDirectories(pdfDir);

    File[] pdfFiles = pdfDir.toFile().listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf"));
    if (pdfFiles == null || pdfFiles.length == 0) {
      System.out.println("Aucun PDF trouvé sous: " + pdfDir);
      return;
    }

    // --- 3) Réindexation des PDF ---
    PdfIndexer indexer = new PdfIndexer(indexPath.toString());
    for (File pdf : pdfFiles) {
      System.out.println("Document trouvé: " + pdf.getAbsolutePath());
      indexer.indexPdf(pdf.getAbsolutePath());
    }

    System.out.println("Indexation terminée (démarrage).");
  }
}
