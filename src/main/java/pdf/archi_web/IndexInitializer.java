package pdf.archi_web;

import jakarta.annotation.PostConstruct;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.*;
import java.net.URL;
import java.nio.file.Files;
import java.util.Objects;

@Component
public class IndexInitializer {

  @PostConstruct
  public void init() throws Exception {

    Files.createDirectories(new File("index").toPath());

    URL url = getClass().getClassLoader().getResource("static/pdf");
    if (url != null && "file".equalsIgnoreCase(url.getProtocol())) {
        File pdfDir = new File(url.toURI());
        File[] pdfFiles = pdfDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf"));

        if (pdfFiles == null || pdfFiles.length == 0) {
            System.out.println("Aucun PDF trouvé en dev sous: " + pdfDir.getAbsolutePath());
            return;
        }

        PdfIndexer indexer = new PdfIndexer("index");
        for (File pdf : pdfFiles) {
            indexer.indexPdf(pdf.getAbsolutePath());
        }
        System.out.println("Indexation terminée (mode dev).");
        return;
        }
    }
}