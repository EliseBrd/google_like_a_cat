package pdf.archi_web;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.io.FileWriter;

@RestController
@RequestMapping("/api")
public class SearchController {

    private final PdfSearcher searcher;

    public SearchController() throws Exception {
        this.searcher = new PdfSearcher("index");
    }

    @GetMapping("/search")
    public List<SearchResult> search(@RequestParam("q") String query) throws Exception {
        List<SearchResult> results = searcher.search(query);
        logSearch(query, results);
        return results;
    }

    @GetMapping("/bonjour")
    public String text() {
        return "Bonjour";
    }

    private void logSearch(String query, List<SearchResult> results) {
        try (FileWriter fw = new FileWriter("recherches.log", true)) {
            fw.write(LocalDateTime.now() + " | '" + query + "' -> " + results + "\n");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
