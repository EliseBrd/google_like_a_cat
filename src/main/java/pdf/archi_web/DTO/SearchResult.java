package pdf.archi_web.DTO;

import lombok.Getter;


@Getter
public class SearchResult {
    private final String filename;
    private final int page;
    private final int paragraph;
    private final int line;
    private final String lineContent;
    private final String url;

    public SearchResult(String filename, int page, int paragraph, int line, String lineContent) {
        this.filename = filename;
        this.page = page;
        this.paragraph = paragraph;
        this.line = line;
        this.lineContent = lineContent;
        this.url = "/pdf/" + filename + "#page=" + page;
    }

    @Override
    public String toString() {
        return filename +
                " : page " + page +
                " | paragraphe " + paragraph +
                " | ligne " + line +
                " -> " + lineContent +
                " | url: " + url;
    }
}