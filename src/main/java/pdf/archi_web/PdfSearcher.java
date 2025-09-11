package pdf.archi_web;

import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.queryparser.classic.ParseException;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.search.*;

import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;
import pdf.archi_web.DTO.SearchResult;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class PdfSearcher {

    @FunctionalInterface
    public interface SearchResultCallback {
        void onResult(SearchResult result);
    }

    private final Directory indexDirectory;
    private final StandardAnalyzer analyzer;

    public PdfSearcher(String indexPath) throws Exception {
        this.indexDirectory = FSDirectory.open(new File(indexPath).toPath());
        this.analyzer = new StandardAnalyzer();
    }

    /**
     * Recherche dans l'index et appelle le callback pour chaque résultat trouvé
     */
    public void search(String query, SearchResultCallback callback) throws IOException, ParseException {
        try (IndexReader reader = DirectoryReader.open(indexDirectory)) {
            IndexSearcher searcher = new IndexSearcher(reader);
            QueryParser parser = new QueryParser("content", analyzer);
            Query q = parser.parse(query);

            // ⏱ Démarrage du timer
            long start = System.nanoTime();

            TopDocs docs = searcher.search(q, 100);
            boolean firstResultFound = false;

            for (ScoreDoc sd : docs.scoreDocs) {
                Document d = searcher.doc(sd.doc);
                String filename = d.get("filename");
                int page = Integer.parseInt(d.get("page"));
                String content = d.get("content");

                // On découpe par paragraphe
                String[] paragraphs = content.split("\\n\\n");
                for (int p = 0; p < paragraphs.length; p++) {
                    String paragraph = paragraphs[p];
                    if (paragraph.toLowerCase().contains(query.toLowerCase())) {
                        // Découpe le paragraphe en lignes
                        String[] lines = paragraph.split("\\n");
                        for (int l = 0; l < lines.length; l++) {
                            if (lines[l].toLowerCase().contains(query.toLowerCase())) {

                                // ⏱ Si c'est le premier résultat, on log le temps
                                if (!firstResultFound) {
                                    long elapsed = System.nanoTime() - start;
                                    double elapsedMs = elapsed / 1_000_000.0;
                                    System.out.println("⏱ Temps jusqu'au premier résultat : " + elapsedMs + " ms");
                                    firstResultFound = true;
                                }

                                callback.onResult(new SearchResult(
                                        filename,
                                        page,
                                        p + 1,
                                        l + 1,
                                        lines[l]
                                ));
                            }
                        }
                    }
                }
            }
        }
    }
}

