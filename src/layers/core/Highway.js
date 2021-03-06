import * as activations from '../../activations';
import Tensor from '../../Tensor';
import Layer from '../../Layer';
import { gemv } from 'ndarray-blas-level2';
import ops from 'ndarray-ops';
import cwise from 'cwise';

/**
 * Highway layer class
 * From Keras docs: Densely connected highway network, a natural extension of LSTMs to feedforward networks.
 */
export default class Highway extends Layer {
  /**
   * Creates a Highway layer
   * @param {number} outputDim - output dimension size
   * @param {Object} [attrs] - layer attributes
   */
  constructor(attrs = {}) {
    super(attrs);
    this.layerClass = 'Highway';

    const { transformBias = -2, activation = 'linear', bias = true } = attrs;

    this.transformBias = transformBias;

    this.activation = activation;
    this.activationFunc = activations[activation];

    this.bias = bias;

    /**
     * Layer weights specification
     */
    this.params = this.bias ? ['W', 'b', 'W_carry', 'b_carry'] : ['W', 'W_carry'];
  }

  _computeOutput = cwise({
    args: ['array', 'array', 'array'],
    body: function(_x, _y, _transform) {
      _x = _y * _transform + (1 - _transform) * _x;
    }
  });

  /**
   * Method for layer computational logic
   * @param {Tensor} x
   * @returns {Tensor} x
   */
  call(x) {
    let y = new Tensor([], [this.weights.W.tensor.shape[1]]);
    if (this.bias) {
      ops.assign(y.tensor, this.weights.b.tensor);
    }
    gemv(1, this.weights.W.tensor.transpose(1, 0), x.tensor, 1, y.tensor);
    this.activationFunc(y);

    let transform = new Tensor([], [this.weights.W_carry.tensor.shape[1]]);
    if (this.bias) {
      ops.assign(transform.tensor, this.weights.b_carry.tensor);
    }
    gemv(1, this.weights.W_carry.tensor.transpose(1, 0), x.tensor, 1, transform.tensor);
    activations.sigmoid(transform);

    this._computeOutput(x.tensor, y.tensor, transform.tensor);

    return x;
  }
}
