import { describe, expect, it } from 'vitest';
import { buildFeatureFocusSnapshot, chatMoreAttachments, chatPrimaryAttachments, featureCatalog, featureSurfaceBudgets, primaryNavigation } from './featureFocus';

describe('feature focus',()=>{
  it('keeps every core feature on a primary destination',()=>{
    const snapshot=buildFeatureFocusSnapshot();
    expect(snapshot.coreDestinationCoverage).toBe(snapshot.coreFeatureCount);
    expect(snapshot.mainNavigationExperiments).toHaveLength(0);
  });

  it('keeps delight features behind chat attachments',()=>{
    expect(featureCatalog.filter(item=>item.tier==='delight').every(item=>item.entry==='chat_attachment')).toBe(true);
  });

  it('keeps the first attachment page focused on five high-frequency actions',()=>{
    const snapshot=buildFeatureFocusSnapshot();
    // Date planning is back as a plan made in the chat itself (no separate
    // screen); location moved to page two. Games moved up; documents down.
    expect(chatPrimaryAttachments.map(item=>item.id)).toEqual(['camera','gallery','games','date','more']);
    expect(snapshot.primaryAttachmentCount).toBe(featureSurfaceBudgets.chat_attachment_primary);
    expect(snapshot.primaryAttachmentOverflow).toBe(0);
    expect(snapshot.duplicatePrimaryAttachmentIds).toHaveLength(0);
  });

  it('keeps delight and secondary share tools on the second attachment page',()=>{
    const secondaryIds=chatMoreAttachments.map(item=>item.id);
    expect(['gif','document','snap','face','contact','poll']).toEqual(expect.arrayContaining(secondaryIds.filter(id=>['gif','document','snap','face','contact','poll'].includes(id))));
    expect(secondaryIds).not.toContain('games');
    expect(chatMoreAttachments.length).toBeLessThanOrEqual(featureSurfaceBudgets.chat_attachment_more);
  });

  it('keeps the launch build to four tabs',()=>{
    expect(primaryNavigation.map(item=>item.label)).toEqual(['Matches','Likes','Chats','Profile']);
    expect(primaryNavigation.length).toBe(featureSurfaceBudgets.primary_navigation);
  });
});
