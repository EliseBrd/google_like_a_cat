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

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class PdfSearcher {

    private final Directory indexDirectory;
    private final StandardAnalyzer analyzer;

    public PdfSearcher(String indexPath) throws Exception {
        this.indexDirectory = FSDirectory.open(new File(indexPath).toPath());
        this.analyzer = new StandardAnalyzer();
    }

    public List<SearchResult> search(String query) throws IOException, ParseException {
        List<SearchResult> results = new ArrayList<>();

        IndexReader reader = DirectoryReader.open(indexDirectory);
        IndexSearcher searcher = new IndexSearcher(reader);
        QueryParser parser = new QueryParser("content", analyzer);
        Query q = parser.parse(query);

        TopDocs docs = searcher.search(q, 100);
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
                    // Découpe le paragraphe en lignes pour avoir le mot
                    String[] lines = paragraph.split("\\n");
                    for (int l = 0; l < lines.length; l++) {
                        if (lines[l].toLowerCase().contains(query.toLowerCase())) {
                            results.add(new SearchResult(
                                    filename,
                                    page,
                                    p + 1,   // numéro du paragraphe
                                    l + 1,       // numéro de la ligne dans le paragraphe
                                    lines[l]     // contenu de la ligne
                            ));
                            return results;
                        }
                    }
                }
            }
        }

        reader.close();
        return results;
    }

}

