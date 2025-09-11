package pdf.archi_web;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.Loader;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.*;
import org.apache.lucene.index.*;
import org.apache.lucene.store.*;

import java.io.File;
import java.io.IOException;

public class PdfIndexer {

    private final Directory indexDirectory;
    private final StandardAnalyzer analyzer;

    public PdfIndexer(String indexPath) throws IOException {
        this.indexDirectory = FSDirectory.open(new File(indexPath).toPath());
        this.analyzer = new StandardAnalyzer();
    }

    public void indexPdf(String pdfPath) throws IOException {
        File file = new File(pdfPath);
        try (PDDocument document = Loader.loadPDF(file)) {
            IndexWriterConfig config = new IndexWriterConfig(analyzer);
            try (IndexWriter writer = new IndexWriter(indexDirectory, config)) {
                PDFTextStripper stripper = new PDFTextStripper();
                int pages = document.getNumberOfPages();
                for (int i = 1; i <= pages; i++) {
                    stripper.setStartPage(i);
                    stripper.setEndPage(i);
                    String text = stripper.getText(document);

                    Document doc = new Document();
                    doc.add(new StringField("filename", file.getName(), Field.Store.YES));
                    doc.add(new StringField("page", String.valueOf(i), Field.Store.YES));
                    doc.add(new TextField("content", text, Field.Store.YES));

                    writer.addDocument(doc);
                }
            }
        }
    }
}
