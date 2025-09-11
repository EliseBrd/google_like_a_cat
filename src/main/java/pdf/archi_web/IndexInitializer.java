package pdf.archi_web;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
public class IndexInitializer {

  @Value("${pdf.storage-dir:resources/static/pdf}")
  private String storageDir;

  @PostConstruct
  public void init() throws Exception {
    Files.createDirectories(Path.of("index"));
    Path pdfDir = Path.of(storageDir).toAbsolutePath().normalize();
    Files.createDirectories(pdfDir);

    File[] pdfFiles = pdfDir.toFile().listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf"));
    if (pdfFiles == null || pdfFiles.length == 0) {
      System.out.println("Aucun PDF trouvé sous: " + pdfDir);
      return;
    }

    PdfIndexer indexer = new PdfIndexer("index");
    for (File pdf : pdfFiles) {
      indexer.indexPdf(pdf.getAbsolutePath());
    }
    System.out.println("Indexation terminée (démarrage).");
  }
}
