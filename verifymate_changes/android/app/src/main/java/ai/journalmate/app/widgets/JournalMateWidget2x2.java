package ai.journalmate.app.widgets;

import ai.journalmate.app.R;

/**
 * 2x2 Small Square Widget - Dark navy design.
 * Shows large app logo with glow + 2x2 grid of stats (Goals, Tasks, Activities, Groups).
 */
public class JournalMateWidget2x2 extends BaseJournalMateWidget {

    @Override
    protected int getLayoutId() {
        return R.layout.widget_2x2_small;
    }
}
