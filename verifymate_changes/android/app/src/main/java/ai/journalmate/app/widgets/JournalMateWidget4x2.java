package ai.journalmate.app.widgets;

import ai.journalmate.app.R;

/**
 * 4x2 Large Widget - Dark navy design with cards.
 * Shows header with logo + "JournalMate" text, followed by 4 data cards
 * for Goals, Tasks, Activities, Groups.
 */
public class JournalMateWidget4x2 extends BaseJournalMateWidget {

    @Override
    protected int getLayoutId() {
        return R.layout.widget_4x2_large;
    }
}
