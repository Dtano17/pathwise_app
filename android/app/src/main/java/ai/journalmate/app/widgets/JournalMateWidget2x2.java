package ai.journalmate.app.widgets;

import ai.journalmate.app.R;

/**
 * 2x2 Small Widget - Triple ring + stats.
 * Shows concentric activity rings with stats below.
 */
public class JournalMateWidget2x2 extends BaseJournalMateWidget {

    @Override
    protected int getLayoutId() {
        return R.layout.widget_2x2_small;
    }

    @Override
    protected boolean hasProgressRings() {
        return true;
    }

    @Override
    protected boolean hasStreak() {
        return false;
    }
}
