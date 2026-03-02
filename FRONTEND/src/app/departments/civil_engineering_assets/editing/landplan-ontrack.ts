import { Api } from '../../../api/api';
import { EditState } from '../../../services/edit-state';
import { LandPlanOntrackViewingLayer } from '../viewing/civil-engineering-assets-viewing';

export class LandPlanOntrackLayer extends LandPlanOntrackViewingLayer {
  constructor(
    api: Api,
    private edit: EditState,
    onData?: (geojson: any) => void
  ) {
    super(api, onData);
  }

  protected override isInteractive(): boolean {
    return true;
  }

  protected override panePointerEvents(): string {
    return 'auto';
  }

  protected override onFeatureReady(feature: any, layer: any): void {
    layer.on('click', () => {
      if (!this.edit.enabled || this.edit.editLayer !== 'landplan') return;
      this.edit.select(feature);
    });
  }
}
