package pdf.archi_web;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
public class IndexInitializer {

    @PostConstruct
    public void init() throws Exception {
        File pdfDir = new File(getClass().getClassLoader().getResource("pdf").getFile());
        File[] pdfFiles = pdfDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf"));

        PdfIndexer indexer = new PdfIndexer("index");
        for (File pdf : pdfFiles) {
            indexer.indexPdf(pdf.getAbsolutePath());
        }
        System.out.println("Indexation terminée !");
    }
}

