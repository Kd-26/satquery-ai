# Research and Standards

This is a design bibliography, not evidence that a dataset/model is approved. Before use, verify the exact version, licence, source-imagery terms, benchmark protocol, errata, and implementation compatibility. Links favor author, publisher, standards-body, or official project pages.

## Domain adaptation and remote-sensing representation

- G. Sumbul, M. Charfuelan, B. Demir, and V. Markl. “BigEarthNet: A Large-Scale Benchmark Archive for Remote Sensing Image Understanding.” *IEEE IGARSS*, 2019. [Official BigEarthNet paper and archive](https://bigearth.net/).
- J. Wang, Z. Zheng, A. Ma, X. Lu, and Y. Zhong. “LoveDA: A Remote Sensing Land-Cover Dataset for Domain Adaptive Semantic Segmentation.” *NeurIPS Datasets and Benchmarks*, 2021. [Official project repository and citation](https://github.com/Junjue-Wang/LoveDA).

## Remote-sensing VQA and grounding benchmarks

- K. Kuckreja, M. S. Danish, M. Naseer, A. Das, S. Khan, and F. S. Khan. “GeoChat: Grounded Large Vision-Language Model for Remote Sensing.” *CVPR*, 2024. [CVF paper](https://openaccess.thecvf.com/content/CVPR2024/html/Kuckreja_GeoChat_Grounded_Large_Vision-Language_Model_for_Remote_Sensing_CVPR_2024_paper.html) and [official repository](https://github.com/mbzuai-oryx/geochat).
- X. Li, J. Ding, and M. Elhoseiny. “VRSBench: A Versatile Vision-Language Benchmark Dataset for Remote Sensing Image Understanding.” *arXiv:2406.12384*, 2024. [Paper](https://arxiv.org/abs/2406.12384) and [author repository](https://github.com/lx709/VRSBench).
- S. Lobry, D. Marcos, J. Murray, and D. Tuia. “RSVQA: Visual Question Answering for Remote Sensing Data.” 2020; venue/issue details require verification against the selected release. [Paper](https://arxiv.org/abs/2003.07333).
- “Change Detection Meets Visual Question Answering.” 2021 preprint introducing CDVQA; authors, final venue, dataset release, and licence require verification before use. [Paper](https://arxiv.org/abs/2112.06343).

## Segmentation and flood evidence

- E. Xie, W. Wang, Z. Yu, A. Anandkumar, J. M. Alvarez, and P. Luo. “SegFormer: Simple and Efficient Design for Semantic Segmentation with Transformers.” *NeurIPS*, 2021. [Paper](https://arxiv.org/abs/2105.15203).
- O. Ronneberger, P. Fischer, and T. Brox. “U-Net: Convolutional Networks for Biomedical Image Segmentation.” *MICCAI*, 2015. [Paper](https://arxiv.org/abs/1505.04597). This is an architectural baseline, not a claim of SAR suitability without task-specific training.
- D. Bonafilia, B. Tellman, T. Anderson, and E. Issenberg. “Sen1Floods11: A Georeferenced Dataset to Train and Test Deep Learning Flood Algorithms for Sentinel-1.” *CVPR Workshops*, 2020. [CVF paper](https://openaccess.thecvf.com/content_CVPRW_2020/html/w11/Bonafilia_Sen1Floods11_A_Georeferenced_Dataset_to_Train_and_Test_Deep_Learning_CVPRW_2020_paper.html) and [official repository](https://github.com/cloudtostreet/Sen1Floods11).

## Change detection

- W. G. C. Bandara and V. M. Patel. “A Transformer-Based Siamese Network for Change Detection.” *IEEE IGARSS*, 2022, pp. 207–210, DOI: 10.1109/IGARSS46834.2022.9883686. [Author repository](https://github.com/wgcban/ChangeFormer). Repository terms state non-commercial/research use; legal review is required.
- The paired datasets used by ChangeFormer have independent licences and split conventions. They must be registered separately; citing the model does not grant dataset rights.

## Physics verification

- J. W. Rouse Jr., R. H. Haas, J. A. Schell, and D. W. Deering. “Monitoring Vegetation Systems in the Great Plains with ERTS.” *Third ERTS Symposium*, NASA SP-351, 1974. Archive link verification required.
- S. K. McFeeters. “The Use of the Normalized Difference Water Index (NDWI) in the Delineation of Open Water Features.” *International Journal of Remote Sensing*, 17(7), 1996. DOI/link verification required before formal publication.
- H. Xu. “Modification of Normalised Difference Water Index (NDWI) to Enhance Open Water Features in Remotely Sensed Imagery.” *International Journal of Remote Sensing*, 27(14), 2006. DOI/link verification required before formal publication.
- Y. Zha, J. Gao, and S. Ni. “Use of Normalized Difference Built-Up Index in Automatically Mapping Urban Areas from TM Imagery.” *International Journal of Remote Sensing*, 24(3), 2003. DOI/link verification required before formal publication.

These papers motivate formulas, not universal thresholds. Product scaling, atmospheric state, masks, and local validation remain necessary.

## Optical–SAR fusion and analysis-ready data

- M. Schmitt, L. H. Hughes, C. Qiu, and X. X. Zhu. “SEN12MS—A Curated Dataset of Georeferenced Multi-Spectral Sentinel-1/2 Imagery for Deep Learning and Data Fusion.” *ISPRS Annals*, 2019, DOI: 10.5194/isprs-annals-IV-2-W7-153-2019. [Publisher paper](https://doi.org/10.5194/isprs-annals-IV-2-W7-153-2019).
- Committee on Earth Observation Satellites (CEOS). “CARD4L Product Family Specification: Surface Reflectance,” version 5.0, 2025. [Official specification](https://ceos.org/ard/files/PFS/SR/v5.0/CARD4L_Product_Family_Specification_Surface_Reflectance-v5.0.pdf).
- CEOS. “CARD4L Product Family Specification: Normalised Radar Backscatter,” version 5.0, 2026. [Official specification](https://ceos.org/ard/files/PFS/NRB/v5.0/CARD4L-PFS_Normalised_Radar_Backscatter-v5.0.pdf). Recheck the version/date at implementation time.

## Agentic reasoning

- S. Yao et al. “ReAct: Synergizing Reasoning and Acting in Language Models.” *ICLR*, 2023. [Paper](https://arxiv.org/abs/2210.03629). SatQuery AI adopts explicit action/observation structure but adds deterministic geospatial guardrails; it is not a direct ReAct implementation yet.
- LangGraph documentation must be pinned to the implemented version when the planner phase begins. No planner library is installed now.

## Parameter-efficient fine-tuning and serving

- E. J. Hu et al. “LoRA: Low-Rank Adaptation of Large Language Models.” *ICLR*, 2022. [OpenReview paper](https://openreview.net/forum?id=nZeVKeeFYf9).
- Hugging Face. “PEFT: Multiple adapters.” Living software documentation. [Official PEFT repository documentation](https://github.com/huggingface/peft/blob/main/docs/source/quicktour.md). Verify exact APIs/version during implementation.
- Anyscale/Ray. “Multi-LoRA deployment.” Living Ray Serve LLM documentation. [Official documentation](https://docs.ray.io/en/latest/serve/llm/user-guides/multi-lora.html). It establishes an available serving pattern, not compatibility with the selected Qwen vision-language checkpoint.

## Geospatial standards

- Open Geospatial Consortium. *OGC GeoTIFF Standard 1.1*, OGC 19-008r4, 2019. [Official standard](https://docs.ogc.org/is/19-008r4/19-008r4.html).
- Open Geospatial Consortium. *OGC Cloud Optimized GeoTIFF Standard 1.0*, OGC 21-026, 2023. [Official standard](https://docs.ogc.org/is/21-026/21-026.html). Consider for object-storage access; it does not replace GeoTIFF metadata validation.
- GeoJSON output should follow the applicable IETF GeoJSON specification and CRS constraints; the exact API/export profile remains to be decided and documented in an ADR if it affects contracts.

## Satellite and SAR preprocessing guidance

- European Space Agency/Copernicus. “Sentinel-1 Processing.” Living SentiWiki technical guidance. [Official processing overview](https://sentiwiki.copernicus.eu/web/s1-processing).
- ESA. “Sentinel-1 Toolbox.” STEP documentation for calibration, speckle filtering, coregistration, orthorectification, and related SAR operations. [Official toolbox page](https://step.esa.int/main/toolboxes/sentinel-1-toolbox/).
- Processing graphs must be product- and task-specific. The presence of a GeoTIFF does not establish that calibration or terrain correction has already occurred.

## ISRO/SAC problem and evaluation material

No project-specific ISRO/SAC problem statement, dataset licence, scoring protocol, or evaluation document was supplied with repository initialization. An official SAC/ISRO document must be added here verbatim by title/version and reviewed before it becomes a requirement. The [SAC VEDAS Smart India Hackathon archive](https://vedas.sac.gov.in/en/sih2022.html) is a discovery reference only and must not be treated as the governing brief for a different edition or challenge.
