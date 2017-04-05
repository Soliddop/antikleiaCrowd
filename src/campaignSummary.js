/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


import { inject } from 'aurelia-framework';
import { Campaign } from './modules/Campaign.js';
import { CampaignServices } from './modules/CampaignServices.js';

@inject(CampaignServices)
export class CampaignSummary {
  scrollTo(anchor) {
    $('html, body').animate({
      scrollTop: $(anchor).offset().top
    }, 1000);
  }

  constructor(campaignServices) {
    this.campaignServices = campaignServices;
    this.campaignId = 0;
    this.campaignIda = 0;
  }

  attached() {
    $('.accountmenu').removeClass('active');
  }

  activate(params) {
    this.campaignIda = params.campaign;
  }

  currentCampaign() {

  }
}
