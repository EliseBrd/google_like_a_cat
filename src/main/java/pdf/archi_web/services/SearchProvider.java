package pdf.archi_web.services;

import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.apache.lucene.document.Document;
import org.apache.lucene.index.DirectoryReader;
import org.apache.lucene.index.IndexReader;
import org.apache.lucene.search.IndexSearcher;
import org.apache.lucene.search.Query;
import org.apache.lucene.search.ScoreDoc;
import org.apache.lucene.search.TopDocs;
import org.apache.lucene.queryparser.classic.QueryParser;
import org.apache.lucene.store.Directory;
import org.apache.lucene.store.FSDirectory;
import org.springframework.stereotype.Service;
import pdf.archi_web.DTO.SearchResult;
import org.apache.lucene.store.*;
import pdf.archi_web.PdfSearcher;

import java.io.File;
import java.io.IOException;
import java.text.ParseException;


@Service
public class SearchProvider {

    private final StandardAnalyzer analyzer;
    private final Directory indexDirectory;

    public SearchProvider() throws IOException {
        this.indexDirectory = FSDirectory.open(new File("index").toPath());
        this.analyzer = new StandardAnalyzer();
    }

    /**
     * Recherche dans l'index et renvoie chaque résultat via un callback.
     */
    public void search(String query, PdfSearcher.SearchResultCallback callback) throws IOException, ParseException {
        try (IndexReader reader = DirectoryReader.open(indexDirectory)) {
            IndexSearcher searcher = new IndexSearcher(reader);
            QueryParser parser = new QueryParser("content", analyzer);
            Query q = parser.parse(query);

            TopDocs docs = searcher.search(q, 100); // max 100 documents

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
                        // Découpe le paragraphe en lignes pour trouver la bonne
                        String[] lines = paragraph.split("\\n");
                        for (int l = 0; l < lines.length; l++) {
                            if (lines[l].toLowerCase().contains(query.toLowerCase())) {
                                SearchResult result = new SearchResult(
                                        filename,
                                        page,
                                        p + 1,   // numéro du paragraphe
                                        l + 1,   // numéro de la ligne
                                        lines[l] // contenu de la ligne
                                );

                                // Envoi du résultat au callback
                                callback.onResult(result);
                            }
                        }
                    }
                }
            }
        } catch (org.apache.lucene.queryparser.classic.ParseException e) {
            throw new RuntimeException(e);
        }
    }
}
